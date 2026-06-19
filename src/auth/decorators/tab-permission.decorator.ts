import { SetMetadata } from '@nestjs/common';

export const RequireTab = (tab: string, permission: string) => {
  return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
    SetMetadata('tab', tab)(target, propertyKey, descriptor);
    SetMetadata('permission', permission)(target, propertyKey, descriptor);
  };
};