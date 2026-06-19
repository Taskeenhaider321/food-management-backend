import { Document, Model } from 'mongoose';

/** Avoid importing the schema here — that creates a circular module graph and breaks resolution for other importers. */
type ParticipantDoc = Document & { participantCode?: string; isNew?: boolean };

export class MeetingParticipantsHooks {
  /**
   * Assigns sequential `participantCode` (P001, …). No `next()` — Mongoose 7+ async save hooks
   * do not pass a callback; calling `next()` caused "next is not a function".
   */
  static async generateParticipantId(doc: ParticipantDoc): Promise<void> {
    if (!doc.isNew || doc.participantCode) return;

    const ModelCtor = doc.constructor as Model<ParticipantDoc>;

    const session =
      typeof (doc as any).$session === 'function'
        ? (doc as any).$session()
        : null;

    let listQuery = ModelCtor.findOne({}, { participantCode: 1 }).sort({
      participantCode: -1,
    });
    if (session) {
      listQuery = listQuery.session(session);
    }
    const latestParticipant = await listQuery.exec();

    let nextNumericPart = 1;
    if (latestParticipant?.participantCode) {
      const numericPart = parseInt(
        String(latestParticipant.participantCode).slice(1),
        10,
      );
      if (!Number.isNaN(numericPart)) {
        nextNumericPart = numericPart + 1;
      }
    }

    doc.participantCode = 'P' + nextNumericPart.toString().padStart(3, '0');
  }
}
