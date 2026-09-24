INSERT INTO "permissions" ("uid", "key", "title", "description", "createdAt", "updatedAt")
VALUES
  ('00000000-0000-4000-8000-000000000512', 'users.manage', 'Управление пользователями', 'Создание, редактирование и удаление пользователей', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('00000000-0000-4000-8000-000000000513', 'roles.manage', 'Управление ролями', 'Создание, редактирование, удаление ролей и изменение назначенных им прав', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('00000000-0000-4000-8000-000000000514', 'system.read', 'Просмотр системы', 'Доступ к runtime metrics, системной диагностике и журналам', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("key") DO UPDATE SET
  "title" = EXCLUDED."title",
  "description" = EXCLUDED."description",
  "deletedAt" = NULL,
  "updatedAt" = CURRENT_TIMESTAMP;

INSERT INTO "role_permissions" ("uid", "roleUid", "permissionUid", "createdAt", "updatedAt")
SELECT md5(role_permission."roleUid"::text || ':' || next_permission."uid"::text)::uuid,
  role_permission."roleUid", next_permission."uid", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "role_permissions" AS role_permission
INNER JOIN "permissions" AS previous_permission ON previous_permission."uid" = role_permission."permissionUid"
INNER JOIN "permissions" AS next_permission ON next_permission."key" = 'users.manage'
WHERE role_permission."deletedAt" IS NULL
  AND previous_permission."key" IN ('users.create', 'users.update', 'users.delete')
GROUP BY role_permission."roleUid", next_permission."uid"
ON CONFLICT ("roleUid", "permissionUid") DO UPDATE SET
  "deletedAt" = NULL,
  "updatedAt" = CURRENT_TIMESTAMP;

INSERT INTO "role_permissions" ("uid", "roleUid", "permissionUid", "createdAt", "updatedAt")
SELECT md5(role_permission."roleUid"::text || ':' || next_permission."uid"::text)::uuid,
  role_permission."roleUid", next_permission."uid", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "role_permissions" AS role_permission
INNER JOIN "permissions" AS previous_permission ON previous_permission."uid" = role_permission."permissionUid"
INNER JOIN "permissions" AS next_permission ON next_permission."key" = 'roles.manage'
WHERE role_permission."deletedAt" IS NULL
  AND previous_permission."key" IN ('roles.create', 'roles.update', 'roles.delete', 'roles.permissions.manage')
GROUP BY role_permission."roleUid", next_permission."uid"
ON CONFLICT ("roleUid", "permissionUid") DO UPDATE SET
  "deletedAt" = NULL,
  "updatedAt" = CURRENT_TIMESTAMP;

INSERT INTO "role_permissions" ("uid", "roleUid", "permissionUid", "createdAt", "updatedAt")
SELECT md5(role_permission."roleUid"::text || ':' || next_permission."uid"::text)::uuid,
  role_permission."roleUid", next_permission."uid", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "role_permissions" AS role_permission
INNER JOIN "permissions" AS previous_permission ON previous_permission."uid" = role_permission."permissionUid"
INNER JOIN "permissions" AS next_permission ON next_permission."key" = 'system.read'
WHERE role_permission."deletedAt" IS NULL
  AND previous_permission."key" IN ('system.metrics.read', 'logs.read')
GROUP BY role_permission."roleUid", next_permission."uid"
ON CONFLICT ("roleUid", "permissionUid") DO UPDATE SET
  "deletedAt" = NULL,
  "updatedAt" = CURRENT_TIMESTAMP;

DELETE FROM "role_permissions"
WHERE "permissionUid" IN (
  SELECT "uid"
  FROM "permissions"
  WHERE "key" IN (
    'users.read', 'users.create', 'users.update', 'users.delete',
    'roles.read', 'roles.create', 'roles.update', 'roles.delete', 'roles.permissions.manage',
    'system.metrics.read', 'logs.read'
  )
);

DELETE FROM "permissions"
WHERE "key" IN (
  'users.read', 'users.create', 'users.update', 'users.delete',
  'roles.read', 'roles.create', 'roles.update', 'roles.delete', 'roles.permissions.manage',
  'system.metrics.read', 'logs.read'
);
