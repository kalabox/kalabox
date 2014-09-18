#!/bin/sh
rm -rf ~/.drush
ln -s /data/config/drush ~/.drush
drush -y dl drupal --destination=/data/code --drupal-project-rename=public
ln -s /data/files /data/code/public/sites/default/files
touch /data/code/public/sites/default/settings.php
chmod 666 /data/code/public/sites/default/settings.php
drush @dev site-install ${DRUPAL_PROFILE} -y --account-name=admin --account-pass=kalabox
drush @dev pm-enable ${DRUPAL_THEME} -y
drush @dev vset theme_default ${DRUPAL_THEME} -y