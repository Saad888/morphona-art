# morphona-art
An art portfolio website + stack for Morphona


Updating the password for an admin account: aws cognito-idp admin-set-user-password \
  --user-pool-id us-west-2_HXZqyoWJi \
  --username <username> \
  --password <password> \
  --permanent


All aws resources are on my @live account

To Do:
- Create dynamo db table for metadata
- Create s3 bucket for files
- Create basic create page 
    - Create lambda to handle upload
    - Create api gateway attached to lambda
    - Create authentication on api gateway
    - Create File thumbnail maker on lambda
- Create list page
- Create edit page
- Create delete endpoint
- Deploy admin portal and all done

- Front End: create everything lol