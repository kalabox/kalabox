# Not in use
# You can run this manually on the docker host to download, setup, & install Drupal
docker run -i -t --rm --volumes-from d7site_data --link=d7site_db:db kalabox/drush -y dl drupal --destination=/data/code --drupal-project-rename=public
docker run -i -t --rm --volumes-from d7site_data kalabox/ubuntu ln -s /data/files /data/code/public/sites/default/files
docker run -i -t --rm --volumes-from d7site_data kalabox/ubuntu touch /data/code/public/sites/default/settings.php
docker run -i -t --rm --volumes-from d7site_data kalabox/ubuntu chmod 666 /data/code/public/sites/default/settings.php
docker run -i -t --rm --volumes-from d7site_data --link=d7site_db:db kalabox/drush @dev site-install -y --account-name=admin --account-pass=kalabox