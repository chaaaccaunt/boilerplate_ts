INSERT INTO `permissions` (`uid`, `key`, `title`, `description`, `createdAt`, `updatedAt`)
VALUES
  ('00000000-0000-4000-8000-000000000512', 'users.manage', 'Управление пользователями', 'Создание, редактирование и удаление пользователей', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('00000000-0000-4000-8000-000000000513', 'roles.manage', 'Управление ролями', 'Создание, редактирование, удаление ролей и изменение назначенных им прав', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('00000000-0000-4000-8000-000000000514', 'system.read', 'Просмотр системы', 'Доступ к runtime metrics, системной диагностике и журналам', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON DUPLICATE KEY UPDATE
  `title` = VALUES(`title`),
  `description` = VALUES(`description`),
  `deletedAt` = NULL,
  `updatedAt` = CURRENT_TIMESTAMP;

INSERT INTO `role_permissions` (`uid`, `roleUid`, `permissionUid`, `createdAt`, `updatedAt`)
SELECT UUID(), assigned.`roleUid`, assigned.`permissionUid`, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM (
  SELECT DISTINCT role_permission.`roleUid`, next_permission.`uid` AS `permissionUid`
  FROM `role_permissions` AS role_permission
  INNER JOIN `permissions` AS previous_permission ON previous_permission.`uid` = role_permission.`permissionUid`
  INNER JOIN `permissions` AS next_permission ON next_permission.`key` = 'users.manage'
  WHERE role_permission.`deletedAt` IS NULL
    AND previous_permission.`key` IN ('users.create', 'users.update', 'users.delete')
) AS assigned
ON DUPLICATE KEY UPDATE
  `deletedAt` = NULL,
  `updatedAt` = CURRENT_TIMESTAMP;

INSERT INTO `role_permissions` (`uid`, `roleUid`, `permissionUid`, `createdAt`, `updatedAt`)
SELECT UUID(), assigned.`roleUid`, assigned.`permissionUid`, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM (
  SELECT DISTINCT role_permission.`roleUid`, next_permission.`uid` AS `permissionUid`
  FROM `role_permissions` AS role_permission
  INNER JOIN `permissions` AS previous_permission ON previous_permission.`uid` = role_permission.`permissionUid`
  INNER JOIN `permissions` AS next_permission ON next_permission.`key` = 'roles.manage'
  WHERE role_permission.`deletedAt` IS NULL
    AND previous_permission.`key` IN ('roles.create', 'roles.update', 'roles.delete', 'roles.permissions.manage')
) AS assigned
ON DUPLICATE KEY UPDATE
  `deletedAt` = NULL,
  `updatedAt` = CURRENT_TIMESTAMP;

INSERT INTO `role_permissions` (`uid`, `roleUid`, `permissionUid`, `createdAt`, `updatedAt`)
SELECT UUID(), assigned.`roleUid`, assigned.`permissionUid`, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM (
  SELECT DISTINCT role_permission.`roleUid`, next_permission.`uid` AS `permissionUid`
  FROM `role_permissions` AS role_permission
  INNER JOIN `permissions` AS previous_permission ON previous_permission.`uid` = role_permission.`permissionUid`
  INNER JOIN `permissions` AS next_permission ON next_permission.`key` = 'system.read'
  WHERE role_permission.`deletedAt` IS NULL
    AND previous_permission.`key` IN ('system.metrics.read', 'logs.read')
) AS assigned
ON DUPLICATE KEY UPDATE
  `deletedAt` = NULL,
  `updatedAt` = CURRENT_TIMESTAMP;

DELETE role_permission
FROM `role_permissions` AS role_permission
INNER JOIN `permissions` AS permission ON permission.`uid` = role_permission.`permissionUid`
WHERE permission.`key` IN (
  'users.read', 'users.create', 'users.update', 'users.delete',
  'roles.read', 'roles.create', 'roles.update', 'roles.delete', 'roles.permissions.manage',
  'system.metrics.read', 'logs.read'
);

DELETE FROM `permissions`
WHERE `key` IN (
  'users.read', 'users.create', 'users.update', 'users.delete',
  'roles.read', 'roles.create', 'roles.update', 'roles.delete', 'roles.permissions.manage',
  'system.metrics.read', 'logs.read'
);
