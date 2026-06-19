import { isCompanyTrainerActor } from './request-actor.util';

export const MY_TRAININGS_MODULE = 'MY_TRAININGS';

/** Endpoints trainers use without an RBAC role assignment. */
export const TRAINER_SELF_SERVICE_PERMISSIONS = new Set([
  'EP_GET_MY_TRAININGS_ASSIGNED',
  'EP_PATCH_MY_TRAININGS_EVALUATE',
  'EP_PATCH_MY_TRAININGS_CONDUCT_EMPLOYEE',
  'EP_GET_TRAINERS_ME',
]);

export function allowsTrainerSelfService(
  user: any,
  requiredModules?: string[],
  requiredPermissions?: string[],
): boolean {
  if (!isCompanyTrainerActor(user)) {
    return false;
  }

  if (requiredModules?.includes(MY_TRAININGS_MODULE)) {
    return true;
  }

  if (
    requiredPermissions?.length &&
    requiredPermissions.every((key) =>
      TRAINER_SELF_SERVICE_PERMISSIONS.has(key),
    )
  ) {
    return true;
  }

  return false;
}
