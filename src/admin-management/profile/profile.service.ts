import { Injectable } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { ClientSession, Connection, Model, Types } from 'mongoose';
import { Profile, ProfileDocument } from './schemas/profile.schema';
import { ProfilePayloadDto } from './dtos/profile-fields.dto';

@Injectable()
export class ProfileService {
  constructor(
    @InjectModel(Profile.name)
    private readonly profileModel: Model<ProfileDocument>,
    @InjectConnection() private readonly connection: Connection,
  ) {}

  async findByUserId(
    userId: string | Types.ObjectId,
  ): Promise<ProfileDocument | null> {
    return this.profileModel.findOne({ userId }).exec();
  }

  async createForUser(
    userId: Types.ObjectId,
    dto: ProfilePayloadDto | undefined,
    session?: ClientSession | null,
  ): Promise<ProfileDocument> {
    const doc = new this.profileModel({
      userId,
      avatar: dto?.avatar,
      designation: dto?.designation,
      age: dto?.age,
      DOB: dto?.DOB ? new Date(dto.DOB) : undefined,
      phoneNo: dto?.phoneNo,
      address: dto?.address,
      identity: dto?.identity,
      qualification: dto?.qualification ?? [],
      experience: dto?.experience ?? [],
      skills: dto?.skills ?? [],
      docs:
        dto?.docs?.map((d) => ({
          ...d,
          // uploadedAt: d.uploadedAt ? new Date(d.uploadedAt) : undefined,
        })) ?? [],
    });
    if (session != null) {
      return doc.save({ session });
    }
    return doc.save();
  }

  /**
   * Runs work inside a multi-document transaction when the deployment supports it (replica set / sharded).
   * On a standalone `mongod`, MongoDB returns "Transaction numbers are only allowed on a replica set member or mongos".
   * In that case (or when `MONGODB_DISABLE_TRANSACTIONS=1`), the same callback runs with no session so local/dev DBs work.
   */
  async withTransaction<T>(
    fn: (session: ClientSession | null) => Promise<T>,
  ): Promise<T> {
    const disabled =
      String(process.env.MONGODB_DISABLE_TRANSACTIONS || '')
        .toLowerCase()
        .trim() === 'true' ||
      String(process.env.MONGODB_DISABLE_TRANSACTIONS || '').trim() === '1';

    const runWithoutSession = () => fn(null);

    if (disabled) {
      return runWithoutSession();
    }

    try {
      return await this.connection.transaction((session) => fn(session));
    } catch (err: unknown) {
      const anyErr = err as {
        code?: number;
        codeName?: string;
        message?: string;
        errorResponse?: { errmsg?: string; code?: number };
      };
      const msg = String(
        anyErr?.message ||
          anyErr?.errorResponse?.errmsg ||
          '',
      );
      const code = anyErr?.code ?? anyErr?.errorResponse?.code;
      const noTxn =
        code === 20 ||
        anyErr?.codeName === 'IllegalOperation' ||
        /Transaction numbers are only allowed on a replica set/i.test(msg);

      if (noTxn) {
        return runWithoutSession();
      }
      throw err;
    }
  }
}
