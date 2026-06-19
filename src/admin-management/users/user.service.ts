import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ClientSession, Model, Types } from 'mongoose';
import * as CryptoJS from 'crypto-js';
import * as jwt from 'jsonwebtoken';
import { EmailService } from '../../email/email.service';
import { CreateSuperAdminDto } from './dtos/create-super-admin.dto';
import { CreateUserDto } from './dtos/create-user.dto';
import { UpdateUserDto } from './dtos/update-user.dto';
import { User, UserDocument, UserRoleType } from './schemas/user.schema';
import { CompanyStatus } from '../company/schemas/company.schema';

@Injectable()
export class UserService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel('Company') private companyModel: Model<any>,
    @InjectModel('Department') private departmentModel: Model<any>,
    private emailService: EmailService,
  ) {}

  async createSuperAdmin(
    createSuperAdminDto: CreateSuperAdminDto,
  ): Promise<{ status: boolean; message: string; data: UserDocument }> {
    const { name, email, userName, password } = createSuperAdminDto;

    const existingUser = await this.userModel.findOne({ userName });
    if (existingUser) {
      throw new ConflictException(`User ${userName} already exists`);
    }

    let company = await this.companyModel.findOne().sort({ created_at: 1 }).exec();
    if (!company) {
      company = await new this.companyModel({
        companyName: 'Default Company',
        shortName: 'DEFAULT',
        email,
        status: 'active',
      }).save();
    }

    const encryptedPassword = this.encryptPassword(password);

    const superAdmin = new this.userModel({
      name,
      email,
      userName,
      password: encryptedPassword,
      roleType: 'super-admin',
      companyId: company._id,
      isSuspended: false,
    });

    const savedUser = await superAdmin.save();

    try {
      await this.emailService.sendRegistrationEmail(
        savedUser.email,
        savedUser.name,
        savedUser.userName,
        password,
      );
    } catch (error) {
      console.error('Email sending failed:', error);
    }

    return {
      status: true,
      message: 'Super admin created successfully',
      data: await this.requirePopulatedUser(savedUser._id.toString()),
    };
  }

  async createUser(
    createUserDto: CreateUserDto,
    actor?: any,
  ): Promise<{ status: boolean; message: string; data: UserDocument[] }> {
    const { users } = createUserDto;

    const addedUsers: UserDocument[] = [];

    for (const u of users) {
      const existingUser = await this.userModel.findOne({
        userName: u.userName,
      });

      if (existingUser) {
        throw new ConflictException(`User ${u.userName} already exists`);
      }

      const encryptedPassword = this.encryptPassword(u.password);

      let deptId: Types.ObjectId | undefined;
      if (u.departmentId) {
        const dept = await this.departmentModel.findById(u.departmentId);
        if (!dept) {
          throw new NotFoundException(
            `Department not found for user ${u.userName}`,
          );
        }
        deptId = dept._id as Types.ObjectId;
      }

      let companyOid: Types.ObjectId | undefined;
      if (u.companyId) {
        companyOid = new Types.ObjectId(u.companyId);
      } else if (actor?.companyId) {
        const cid = typeof actor.companyId === 'object' ? actor.companyId._id : actor.companyId;
        if (cid) companyOid = new Types.ObjectId(String(cid));
      }

      const newUser = new this.userModel({
        name: u.name,
        email: u.email,
        userName: u.userName,
        password: encryptedPassword,
        roleType: UserRoleType.SUPER_ADMIN,
        companyId: companyOid,
        departmentId: deptId,
        isSuspended: false,
      });

      const savedUser = await newUser.save();

      addedUsers.push(
        await this.requirePopulatedUser(savedUser._id.toString()),
      );

      try {
        await this.emailService.sendRegistrationEmail(
          newUser.email,
          newUser.name,
          newUser.userName,
          u.password,
        );
      } catch (error) {
        console.error('Email sending failed:', error);
      }
    }

    return {
      status: true,
      message: 'Users created successfully',
      data: addedUsers,
    };
  }

  async createUserRecord(
    params: {
      name: string;
      email: string;
      userName: string;
      passwordPlain: string;
      roleType?: string;
      companyId: string;
      departmentId?: string;
    },
    session?: ClientSession | null,
  ): Promise<UserDocument> {
    const existingUser = await this.userModel
      .findOne({ userName: params.userName })
      .session(session ?? null);
    if (existingUser) {
      throw new ConflictException(`User ${params.userName} already exists`);
    }

    const company = await this.companyModel
      .findById(params.companyId)
      .session(session ?? null);
    if (!company) {
      throw new NotFoundException('Company not found');
    }

    let deptId: Types.ObjectId | undefined;
    if (params.departmentId) {
      const d = await this.departmentModel
        .findOne({ _id: params.departmentId })
        .session(session ?? null);
      if (!d) {
        throw new NotFoundException('Department not found');
      }
      deptId = d._id as Types.ObjectId;
    }

    const doc = new this.userModel({
      name: params.name,
      email: params.email,
      userName: params.userName,
      password: this.encryptPassword(params.passwordPlain),
      roleType: UserRoleType.SUPER_ADMIN,
      companyId: new Types.ObjectId(params.companyId),
      departmentId: deptId,
      isSuspended: false,
    });

    if (session != null) {
      return doc.save({ session });
    }
    return doc.save();
  }

  async getUser(userId: string, actor?: any) {
    const user = await this.getPopulatedUser(userId);
    if (!user) {
      throw new NotFoundException(
        `User document with this ID: ${userId} not found`,
      );
    }

    const data = await this.buildUserPayload(user);
    return { status: true, data };
  }

  async getUserByCompany(companyId: string, actor?: any) {
    const users = await this.userModel
      .find({ companyId: new Types.ObjectId(companyId) })
      .populate('departmentId')
      .populate('companyId')
      .exec();

    return { status: true, data: users };
  }

  async getUsersByDepartment(departmentId: string, actor?: any) {
    const users = await this.userModel
      .find({ departmentId: new Types.ObjectId(departmentId) })
      .populate('departmentId')
      .populate('companyId')
      .exec();

    return { status: true, data: users };
  }

  async getAllUsers(departmentId: string, actor?: any) {
    const departmentExist = await this.departmentModel.findById(departmentId);
    if (!departmentExist) {
      throw new NotFoundException(
        `Department document with ID: ${departmentId} not found`,
      );
    }

    const users = await this.userModel
      .find({ departmentId: new Types.ObjectId(departmentId) })
      .populate('departmentId')
      .populate('companyId')
      .exec();

    const totalUsers = users.length;

    return { status: true, total: totalUsers, data: users };
  }

  async getUsersByCompanyAndDepartment(
    companyId: string,
    departmentId: string,
    actor?: any,
  ) {
    const dept = await this.departmentModel.findById(departmentId).lean();
    if (!dept) {
      throw new NotFoundException(
        `Department document with ID: ${departmentId} not found`,
      );
    }

    const users = await this.userModel
      .find({
        companyId: new Types.ObjectId(companyId),
        departmentId: new Types.ObjectId(departmentId),
      })
      .populate('departmentId')
      .populate('companyId')
      .exec();

    return { status: true, data: users };
  }

  async deleteUser(userId: string, actor?: any) {
    const deletedUser = await this.userModel.findByIdAndDelete(userId);
    if (!deletedUser) {
      throw new NotFoundException(`User document with ID: ${userId} not found`);
    }

    return {
      status: true,
      message: 'User document deleted successfully',
      data: deletedUser,
    };
  }

  async updateUser(updateData: UpdateUserDto, actor?: any) {
    const { userId, password, ...updates } = updateData;
    if (!userId) {
      throw new BadRequestException('userId is required');
    }

    const target = await this.userModel.findById(userId);
    if (!target) {
      throw new NotFoundException(`User document with ID: ${userId} not found`);
    }

    const payload: Record<string, unknown> = { ...updates };
    if (password) {
      payload.password = this.encryptPassword(password);
    }

    const updatedUser = await this.userModel
      .findByIdAndUpdate(userId, payload, { returnDocument: 'after' })
      .populate('departmentId')
      .populate('companyId')
      .exec();

    if (!updatedUser) {
      throw new NotFoundException(`User document with ID: ${userId} not found`);
    }

    return {
      status: true,
      message: 'User document updated successfully',
      data: updatedUser,
    };
  }

  async assignRole(
    userId: string,
    roleData: { roleId: string; companyId?: string },
    actor?: any,
  ) {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException(`User document with ID: ${userId} not found`);
    }

    return {
      status: true,
      message: 'Operation completed',
      data: await this.getPopulatedUser(userId),
    };
  }

  async userLogin(loginData: { userName: string; password: string }) {
    const user = await this.userModel
      .findOne({ userName: loginData.userName })
      .populate('departmentId')
      .populate('companyId')
      .exec();

    if (!user) {
      throw new UnauthorizedException('User not Exist or Wrong Credentials!');
    }

    const storedPasswordHash = CryptoJS.AES.decrypt(
      user.password,
      process.env.PASS_CODE || 'default-secret',
    );
    const storedPassword = storedPasswordHash.toString(CryptoJS.enc.Utf8);

    if (storedPassword !== loginData.password) {
      throw new BadRequestException('Wrong Password');
    }

    if (user.isSuspended) {
      throw new ForbiddenException('Access denied.');
    }

    const company = user.companyId as any;

    const accessToken = jwt.sign(
      {
        userId: user._id,
        companyId: company?._id || user.companyId,
      },
      process.env.JWT_CODE,
      { expiresIn: '2d' },
    );

    const userPayload = await this.buildUserPayload(user);

    return {
      status: true,
      message: 'User Logged In successfully',
      ...userPayload,
      Token: accessToken,
    };
  }

  async reassignAccess(userId: string, actor?: any) {
    const updatedUser = await this.userModel.findByIdAndUpdate(
      userId,
      { $set: { isSuspended: false } },
      { returnDocument: 'after' },
    );
    if (!updatedUser) {
      throw new NotFoundException(`User with ID: ${userId} not found`);
    }

    return {
      status: true,
      message: 'Access reassigned successfully',
      data: updatedUser,
    };
  }

  async suspendUser(userId: string, suspended: boolean, actor?: any) {
    const updated = await this.userModel.findByIdAndUpdate(
      userId,
      { $set: { isSuspended: suspended } },
      { returnDocument: 'after' },
    );
    if (!updated) {
      throw new NotFoundException(`User with ID: ${userId} not found`);
    }

    return {
      status: true,
      message: suspended
        ? 'User suspended successfully'
        : 'User activated successfully',
      data: updated,
    };
  }

  async changePassword(userId: string, newPassword: string) {
    if (!userId || !newPassword) {
      throw new BadRequestException(
        'userId and newPassword are required',
      );
    }
  
    const hashedPassword = this.encryptPassword(newPassword);
  
    const updatedUser = await this.userModel.findByIdAndUpdate(
      userId,
      { password: hashedPassword },
      { new: true },
    );
  
    if (!updatedUser) {
      throw new NotFoundException('User not found');
    }
  
    return {
      status: true,
      message: 'Password changed successfully',
      data: updatedUser,
    };
  }

  async resetCredentials(userId: any, newUserName: string, newPassword: string) {
    const user = await this.userModel.findById(userId);
    if (!user) throw new NotFoundException('User not found');

    const existingUser = await this.userModel.findOne({
      userName: newUserName,
      _id: { $ne: userId },
    });
    if (existingUser) {
      throw new ConflictException('Username already taken');
    }

    user.userName = newUserName;
    user.password = this.encryptPassword(newPassword);
    await user.save();

    return {
      status: true,
      message: 'Credentials reset successfully',
      data: user,
    };
  }

  async findByCompany(companyId: string): Promise<UserDocument[]> {
    const result = await this.getUserByCompany(companyId);
    return result.data;
  }

  async findByDepartment(departmentId: string): Promise<UserDocument[]> {
    const result = await this.getUsersByDepartment(departmentId);
    return result.data;
  }

  async findOne(id: string, actor?: any): Promise<UserDocument> {
    const user = await this.getPopulatedUser(id);
    if (!user) {
      throw new NotFoundException(
        `User document with this ID: ${id} not found`,
      );
    }
    return user;
  }

  async findAll(actor?: any): Promise<UserDocument[]> {
    return this.userModel
      .find()
      .populate('companyId')
      .populate('departmentId')
      .exec();
  }

  async update(
    id: string,
    updateUserDto: UpdateUserDto,
    actor?: any,
  ): Promise<UserDocument> {
    const { userId: _omit, ...rest } = updateUserDto;
    const result = await this.updateUser({ userId: id, ...rest }, actor);
    return result.data;
  }

  async remove(id: string, actor?: any): Promise<void> {
    await this.deleteUser(id, actor);
  }

  private async buildUserPayload(
    user: UserDocument,
  ): Promise<Record<string, unknown>> {
    const raw = user.toObject();
    delete (raw as any).password;
    delete (raw as any).__v;

    const { companyId, departmentId, ...rest } = raw as any;

    return {
      ...rest,
      companyId: this.sanitizeCompanyForSession(companyId),
      departmentId: this.sanitizeDepartmentForSession(departmentId),
      access: { modules: [] },
    };
  }

  private sanitizeCompanyForSession(company: any): unknown {
    if (company == null) return null;
    if (typeof company !== 'object') return company;
    if (!('companyName' in company) && company._id) {
      return { _id: company._id };
    }
    return {
      _id: company._id,
      companyName: company.companyName,
      shortName: company.shortName,
      address: company.address,
      contactNo: company.contactNo,
      email: company.email,
      status: company.status,
      companyLogo: company.companyLogo,
      created_at: company.created_at,
      updated_at: company.updated_at,
    };
  }

  private sanitizeDepartmentForSession(dept: any): unknown {
    if (dept == null) return null;
    if (typeof dept !== 'object') return dept;
    if (!('departmentName' in dept) && dept._id) {
      return { _id: dept._id };
    }
    return {
      _id: dept._id,
      departmentName: dept.departmentName,
      shortName: dept.shortName,
      created_at: dept.created_at,
      updated_at: dept.updated_at,
    };
  }

  private encryptPassword(password: string) {
    return CryptoJS.AES.encrypt(
      password,
      process.env.PASS_CODE || 'default-secret',
    ).toString();
  }

  private async getPopulatedUser(userId: string) {
    return this.userModel
      .findById(userId)
      .populate('departmentId')
      .populate('companyId')
      .exec();
  }

  private async requirePopulatedUser(userId: string) {
    const user = await this.getPopulatedUser(userId);
    if (!user) {
      throw new NotFoundException(`User document with ID: ${userId} not found`);
    }

    return user;
  }
}
