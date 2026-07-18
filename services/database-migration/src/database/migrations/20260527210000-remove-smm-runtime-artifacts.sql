DELETE FROM `runtime_package_connections`
WHERE `packageUid` = '00000000-0000-4000-8000-000000000408';

UPDATE `log_records`
SET `packageUid` = '00000000-0000-4000-8000-000000000401'
WHERE `packageUid` = '00000000-0000-4000-8000-000000000408';

DELETE FROM `runtime_packages`
WHERE `uid` = '00000000-0000-4000-8000-000000000408'
  OR `name` = 'smm-service';

DELETE `role_permissions`
FROM `role_permissions`
INNER JOIN `permissions`
  ON `permissions`.`uid` = `role_permissions`.`permissionUid`
WHERE `permissions`.`key` = 'media.manage';

DELETE FROM `permissions`
WHERE `key` = 'media.manage';

DROP TABLE IF EXISTS `service_tokens`;
