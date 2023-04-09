# Setup aws-iam-authenticator

#### Sample workflow to install a specific version of aws-iam-authenticator binary on the runner.

Acceptable values are latest or any semantic version string like `0.6.2`. Use this action in workflow to define which version of aws-iam-authenticator will be used.

```yaml
- uses: mostafahussein/setup-aws-iam-authenticator@v1
  with:
     version: '<version>' # default is latest stable
  id: install
```

Refer to the action metadata file for details about all the inputs https://github.com/mostafahussein/setup-aws-iam-authenticator/blob/main/action.yml
