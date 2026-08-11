import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  forwardRef,
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ClientSession, Model, Types } from 'mongoose';
import * as CryptoJS from 'crypto-js';
import * as jwt from 'jsonwebtoken';
import { EmailService } from '../../email/email.service';
import { AuthorizationService } from '../../rbac/authorization.service';
import { RbacService } from '../../rbac/rbac.service';
import {
  assertActorMayAccessCompany,
  assertActorMayAccessUserRecord,
  actorIdString,
  actorCompanyIdString,
  actorDepartmentIdString,
  isCompanyAdminActor,
  isCompanyUserActor,
  isSuperAdminActor,
  isSuperStaffActor,
} from '../../auth/utils/request-actor.util';
import { CreateSuperAdminDto } from './dtos/create-super-admin.dto';
import { CreateUserDto } from './dtos/create-user.dto';
import { UpdateUserDto } from './dtos/update-user.dto';
import { User, UserDocument, UserRoleType } from './schemas/user.schema';

@Injectable()
export class UserService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel('Company') private companyModel: Model<any>,
    @InjectModel('Department') private departmentModel: Model<any>,
    private emailService: EmailService,
    @Inject(forwardRef(() => AuthorizationService))
    private readonly authorizationService: AuthorizationService,
    @Inject(forwardRef(() => RbacService))
    private readonly rbacService: RbacService,
  ) {}

  async createSuperAdmin(
    createSuperAdminDto: CreateSuperAdminDto,
  ): Promise<{ status: boolean; message: string; data: UserDocument }> {
    const { name, email, userName, password } = createSuperAdminDto;

    const existingUser = await this.userModel.findOne({ userName });
    if (existingUser) {
      throw new ConflictException(`User ${userName} already exists`);
    }

    let company = await this.companyModel
      .findOne()
      .sort({ created_at: 1 })
      .exec();
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

      let companyOid: Types.ObjectId | undefined;
      // Company-scoped actors always bind users to their own company —
      // never trust a foreign companyId from the request body.
      if (isCompanyAdminActor(actor) || isCompanyUserActor(actor)) {
        const mine = actorCompanyIdString(actor);
        if (!mine) {
          throw new ForbiddenException('Company context is required');
        }
        if (u.companyId && String(u.companyId) !== mine) {
          throw new ForbiddenException(
            'You may only create users for your company',
          );
        }
        companyOid = new Types.ObjectId(mine);
      } else if (u.companyId) {
        // Super Admin / Super Staff may create company users only when the
        // payload explicitly includes companyId. Do NOT inherit actor.companyId
        // — that incorrectly makes System Staff users company-scoped.
        companyOid = new Types.ObjectId(u.companyId);
      }

      let deptId: Types.ObjectId | undefined;
      if (u.departmentId) {
        const dept = await this.departmentModel.findById(u.departmentId);
        if (!dept) {
          throw new NotFoundException(
            `Department not found for user ${u.userName}`,
          );
        }
        const deptCompanyId =
          dept.companyId != null ? String(dept.companyId) : null;
        if (!companyOid || !deptCompanyId) {
          throw new ForbiddenException(
            'Department must belong to the assigned company',
          );
        }
        if (deptCompanyId !== String(companyOid)) {
          throw new ForbiddenException(
            'You may only assign departments from your company',
          );
        }
        deptId = dept._id as Types.ObjectId;
      }

      // No companyId => global System Staff (super-staff). Explicit companyId
      // => company-scoped user. Never infer company from the actor.
      const provisionalUser = {
        companyId: companyOid,
        roleType: companyOid
          ? UserRoleType.COMPANY_USER
          : UserRoleType.SUPER_STAFF,
      };

      if (u.roleId && actor) {
        await this.rbacService.assertRoleAssignmentAllowed(
          actor,
          provisionalUser,
          u.roleId,
        );
      }

      const newUser = new this.userModel({
        name: u.name,
        email: u.email,
        userName: u.userName,
        password: encryptedPassword,
        roleType: provisionalUser.roleType,
        companyId: companyOid,
        departmentId: deptId,
        roleId: u.roleId ? new Types.ObjectId(u.roleId) : undefined,
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
      roleId?: string;
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
      const deptCompanyId = d.companyId != null ? String(d.companyId) : null;
      if (!deptCompanyId || deptCompanyId !== String(params.companyId)) {
        throw new ForbiddenException(
          'You may only assign departments from your company',
        );
      }
      deptId = d._id as Types.ObjectId;
    }

    const roleType = (params.roleType ||
      UserRoleType.COMPANY_USER) as UserRoleType;

    const doc = new this.userModel({
      name: params.name,
      email: params.email,
      userName: params.userName,
      password: this.encryptPassword(params.passwordPlain),
      roleType,
      companyId: new Types.ObjectId(params.companyId),
      departmentId: deptId,
      roleId: params.roleId ? new Types.ObjectId(params.roleId) : undefined,
      isSuspended: false,
    });

    if (session != null) {
      return doc.save({ session });
    }
    return doc.save();
  }

  async getUser(userId: string, _actor?: any) {
    const user = await this.getPopulatedUser(userId);
    if (!user) {
      throw new NotFoundException(
        `User document with this ID: ${userId} not found`,
      );
    }

    const data = await this.buildUserPayload(user);
    return { status: true, data };
  }

  async getUserByCompany(companyId: string, _actor?: any) {
    if (!_actor) {
      throw new ForbiddenException('Authentication required');
    }

    if (isSuperAdminActor(_actor) || isSuperStaffActor(_actor)) {
      const users = await this.userModel
        .find({ companyId: new Types.ObjectId(companyId) })
        .populate('departmentId')
        .populate('companyId')
        .exec();

      return { status: true, data: users };
    }

    // company-admin: full listing inside their own company
    if (isCompanyAdminActor(_actor)) {
      assertActorMayAccessCompany(_actor, companyId);
      const users = await this.userModel
        .find({ companyId: new Types.ObjectId(companyId) })
        .populate('departmentId')
        .populate('companyId')
        .exec();

      return { status: true, data: users };
    }

    // company-user / trainer / employee: self-only
    const selfCompanyId = actorCompanyIdString(_actor);
    if (!selfCompanyId || selfCompanyId !== String(companyId)) {
      throw new ForbiddenException('You may only access your own user record');
    }

    const self = await this.userModel
      .findOne({ _id: new Types.ObjectId(String(_actor._id)) })
      .populate('departmentId')
      .populate('companyId')
      .exec();

    return { status: true, data: self ? [self] : [] };
  }

  async getUsersByDepartment(departmentId: string, _actor?: any) {
    if (!_actor) {
      throw new ForbiddenException('Authentication required');
    }

    if (isSuperAdminActor(_actor) || isSuperStaffActor(_actor)) {
      const users = await this.userModel
        .find({ departmentId: new Types.ObjectId(departmentId) })
        .populate('departmentId')
        .populate('companyId')
        .exec();
      return { status: true, data: users };
    }

    if (isCompanyAdminActor(_actor)) {
      const dept = await this.departmentModel.findById(departmentId).lean();
      if (!dept) throw new NotFoundException('Department not found');
      assertActorMayAccessCompany(_actor, String(dept.companyId));

      const users = await this.userModel
        .find({ departmentId: new Types.ObjectId(departmentId) })
        .populate('departmentId')
        .populate('companyId')
        .exec();
      return { status: true, data: users };
    }

    // company-user / trainer / employee: self-only (department scoped)
    const selfDeptId = actorDepartmentIdString(_actor);
    if (!selfDeptId || selfDeptId !== String(departmentId)) {
      throw new ForbiddenException('You may only access your own user record');
    }

    const self = await this.userModel
      .findOne({ _id: new Types.ObjectId(String(_actor._id)) })
      .populate('departmentId')
      .populate('companyId')
      .exec();

    return { status: true, data: self ? [self] : [] };
  }

  async getAllUsers(departmentId: string, _actor?: any) {
    if (!_actor) {
      throw new ForbiddenException('Authentication required');
    }

    if (isSuperAdminActor(_actor) || isSuperStaffActor(_actor)) {
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

    if (isCompanyAdminActor(_actor)) {
      const departmentExist = await this.departmentModel
        .findById(departmentId)
        .lean();
      if (!departmentExist) {
        throw new NotFoundException(
          `Department document with ID: ${departmentId} not found`,
        );
      }
      assertActorMayAccessCompany(_actor, String(departmentExist.companyId));

      const users = await this.userModel
        .find({ departmentId: new Types.ObjectId(departmentId) })
        .populate('departmentId')
        .populate('companyId')
        .exec();

      return {
        status: true,
        total: users.length,
        data: users,
      };
    }

    // company-user / trainer / employee: self-only (department scoped)
    const selfDeptId = actorDepartmentIdString(_actor);
    if (!selfDeptId || selfDeptId !== String(departmentId)) {
      throw new ForbiddenException('You may only access your own user record');
    }

    const self = await this.userModel
      .findOne({ _id: new Types.ObjectId(String(_actor._id)) })
      .populate('departmentId')
      .populate('companyId')
      .exec();

    return {
      status: true,
      total: self ? 1 : 0,
      data: self ? [self] : [],
    };
  }

  async getUsersByCompanyAndDepartment(
    companyId: string,
    departmentId: string,
    _actor?: any,
  ) {
    if (!_actor) {
      throw new ForbiddenException('Authentication required');
    }

    const dept = await this.departmentModel.findById(departmentId).lean();
    if (!dept) {
      throw new NotFoundException(
        `Department document with ID: ${departmentId} not found`,
      );
    }

    if (isSuperAdminActor(_actor) || isSuperStaffActor(_actor)) {
      // no restriction
    } else if (isCompanyAdminActor(_actor)) {
      assertActorMayAccessCompany(_actor, companyId);
    } else {
      // company-user / trainer / employee: self-only
      const selfCompanyId = actorCompanyIdString(_actor);
      const selfDeptId = actorDepartmentIdString(_actor);
      if (
        !selfCompanyId ||
        !selfDeptId ||
        selfCompanyId !== String(companyId) ||
        selfDeptId !== String(departmentId)
      ) {
        throw new ForbiddenException(
          'You may only access your own user record',
        );
      }
    }

    const users = await this.userModel
      .find({
        companyId: new Types.ObjectId(companyId),
        departmentId: new Types.ObjectId(departmentId),
      })
      .populate('departmentId')
      .populate('companyId')
      .exec();

    if (!(isSuperAdminActor(_actor) || isSuperStaffActor(_actor))) {
      // self-only actors get only their own record even if department matches
      if (!isCompanyAdminActor(_actor)) {
        const self = users.find((u) => String(u._id) === String(_actor._id));
        return { status: true, data: self ? [self] : [] };
      }
    }

    return { status: true, data: users };
  }

  async deleteUser(userId: string, _actor?: any) {
    if (_actor) {
      const target = await this.userModel.findById(userId).lean();
      assertActorMayAccessUserRecord(_actor, target);
    }
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

  async updateUser(updateData: UpdateUserDto, _actor?: any) {
    const { userId, password, ...updates } = updateData;
    if (!userId) {
      throw new BadRequestException('userId is required');
    }

    const target = await this.userModel.findById(userId);
    if (!target) {
      throw new NotFoundException(`User document with ID: ${userId} not found`);
    }

    if (_actor) {
      assertActorMayAccessUserRecord(_actor, target);
    }

    const payload: Record<string, unknown> = { ...updates };
    if (password) {
      payload.password = this.encryptPassword(password);
    }

    if (_actor && updates.roleId) {
      const projected = {
        ...target.toObject(),
        companyId:
          updates.companyId != null ? updates.companyId : target.companyId,
        roleType: updates.roleType ?? target.roleType,
      };
      await this.rbacService.assertRoleAssignmentAllowed(
        _actor,
        projected,
        String(updates.roleId),
      );
    }

    // Company actors must not move users across companies or escalate roleType.
    if (_actor && !isSuperAdminActor(_actor) && !isSuperStaffActor(_actor)) {
      if (
        updates.companyId != null &&
        String(updates.companyId) !== actorCompanyIdString(_actor)
      ) {
        throw new ForbiddenException('You may only keep users in your company');
      }
      if (
        updates.roleType &&
        ['super-admin', 'super-staff'].includes(String(updates.roleType))
      ) {
        throw new ForbiddenException(
          'Company actors may not grant global system role types',
        );
      }
    }

    if (
      isSuperStaffActor(_actor) &&
      updates.companyId != null &&
      String(updates.companyId).length > 0
    ) {
      throw new ForbiddenException(
        'System users may not attach company scope to users via update',
      );
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
    _actor?: any,
  ) {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException(`User document with ID: ${userId} not found`);
    }

    if (_actor) {
      assertActorMayAccessUserRecord(_actor, user);
    }

    if (!Types.ObjectId.isValid(roleData.roleId)) {
      throw new BadRequestException('Invalid roleId');
    }

    await this.rbacService.assertRoleAssignmentAllowed(
      _actor,
      user,
      roleData.roleId,
    );

    user.roleId = new Types.ObjectId(roleData.roleId) as any;
    await user.save();

    return {
      status: true,
      message: 'Role assigned successfully',
      data: await this.getPopulatedUser(userId),
    };
  }

  async userLogin(loginData: { userName: string; password: string }) {
    const userName = String(loginData.userName || '').trim();
    // Exact match first, then case-insensitive (usernames are stored trimmed).
    let user = await this.userModel
      .findOne({ userName })
      .populate('departmentId')
      .populate('companyId')
      .populate({
        path: 'roleId',
        populate: [
          { path: 'moduleIds' },
          {
            path: 'derivedModuleIds',
            populate: [
              { path: 'masterModuleId' },
              { path: 'selectedPermissionIds' },
            ],
          },
        ],
      })
      .exec();

    if (!user && userName) {
      const escaped = userName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      user = await this.userModel
        .findOne({ userName: { $regex: `^${escaped}$`, $options: 'i' } })
        .populate('departmentId')
        .populate('companyId')
        .populate({
          path: 'roleId',
          populate: [
            { path: 'moduleIds' },
            {
              path: 'derivedModuleIds',
              populate: [
                { path: 'masterModuleId' },
                { path: 'selectedPermissionIds' },
              ],
            },
          ],
        })
        .exec();
    }

    if (!user) {
      throw new UnauthorizedException('User not Exist or Wrong Credentials!');
    }

    const storedPasswordHash = CryptoJS.AES.decrypt(
      user.password,
      process.env.PASS_CODE || 'default-secret',
    );
    const storedPassword = storedPasswordHash.toString(CryptoJS.enc.Utf8);

    if (!storedPassword || storedPassword !== loginData.password) {
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

  async reassignAccess(userId: string, _actor?: any) {
    if (_actor) {
      const target = await this.userModel.findById(userId).lean();
      assertActorMayAccessUserRecord(_actor, target);
    }
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

  async suspendUser(userId: string, suspended: boolean, _actor?: any) {
    if (_actor) {
      const target = await this.userModel.findById(userId).lean();
      assertActorMayAccessUserRecord(_actor, target);
    }
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
      throw new BadRequestException('userId and newPassword are required');
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

  async resetCredentials(
    userId: any,
    newUserName: string,
    newPassword: string,
  ) {
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

  async findOne(id: string, _actor?: any): Promise<UserDocument> {
    const user = await this.getPopulatedUser(id);
    if (!user) {
      throw new NotFoundException(
        `User document with this ID: ${id} not found`,
      );
    }
    return user;
  }

  async findAll(_actor?: any): Promise<UserDocument[]> {
    if (!_actor) {
      throw new ForbiddenException('Authentication required');
    }

    if (isSuperAdminActor(_actor) || isSuperStaffActor(_actor)) {
      return this.userModel
        .find()
        .populate('companyId')
        .populate('departmentId')
        .exec();
    }

    if (isCompanyAdminActor(_actor)) {
      const companyId = actorCompanyIdString(_actor);
      if (!companyId) return [];
      return this.userModel
        .find({ companyId: new Types.ObjectId(companyId) })
        .populate('companyId')
        .populate('departmentId')
        .exec();
    }

    // company-user / trainer / employee: self-only
    const selfId = actorIdString(_actor);
    if (!selfId) return [];
    return this.userModel
      .find({ _id: new Types.ObjectId(selfId) })
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
    delete raw.password;
    delete raw.__v;

    const { companyId, departmentId, ...rest } = raw;
    const access = await this.authorizationService.buildAccessForUser(raw);

    return {
      ...rest,
      companyId: this.sanitizeCompanyForSession(companyId),
      departmentId: this.sanitizeDepartmentForSession(departmentId),
      access,
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
