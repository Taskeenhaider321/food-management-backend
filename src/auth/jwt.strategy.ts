import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  User,
  UserDocument,
} from '../admin-management/users/schemas/user.schema';
import { AuthorizationService } from '../rbac/authorization.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private readonly authorizationService: AuthorizationService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_CODE,
    });
  }

  async validate(payload: any) {
    const userId = payload.userId || payload.id;
    const user = await this.userModel
      .findById(userId)
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

    if (!user || user.isSuspended) {
      throw new UnauthorizedException();
    }

    const plain = user.toObject();
    const resolvedPermissions =
      await this.authorizationService.resolvePermissionKeysForUser(plain);

    return {
      ...plain,
      resolvedPermissions,
    };
  }
}
