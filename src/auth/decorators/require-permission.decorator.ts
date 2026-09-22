import { SetMetadata } from '@nestjs/common';

export const REQUIRED_PERMISSION_KEY = 'requiredPermission';
export const REQUIRED_ANY_PERMISSION_KEY = 'requiredAnyPermission';
export const REQUIRED_BODY_FIELD_PERMISSIONS_KEY =
  'requiredBodyFieldPermissions';
export const RequirePermission = (permission: string) =>
  SetMetadata(REQUIRED_PERMISSION_KEY, permission);

export const RequirePermissions = (...permissions: string[]) =>
  SetMetadata(REQUIRED_PERMISSION_KEY, permissions);

export const RequireAnyPermission = (...permissions: string[]) =>
  SetMetadata(REQUIRED_ANY_PERMISSION_KEY, permissions);

export const RequireBodyFieldPermissions = (
  permissions: Record<string, string[]>,
) => SetMetadata(REQUIRED_BODY_FIELD_PERMISSIONS_KEY, permissions);
