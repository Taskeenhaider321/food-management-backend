import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../admin-management/users/schemas/user.schema';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
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
      .exec();

    if (!user || user.isSuspended) {
      throw new UnauthorizedException();
    }

    return user.toObject();
  }
}
