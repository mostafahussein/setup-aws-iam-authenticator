import os
import sys
import json
import requests
import time


def get_latest_version():
    response = None
    time_to_sleep = 2
    request_headers = { "Accept" : "application/json" }
    for _ in range(10):
        response = requests.get(
            'https://github.com/kubernetes-sigs/aws-iam-authenticator/releases/latest',headers=request_headers)
        if response.status_code == 200:
            break
        print('Failed to obtain latest version info, retrying.')
        time.sleep(time_to_sleep)
        time_to_sleep *= 2
    response_value = response.json()['tag_name'][1:]
    return response_value


version_arg = sys.argv[1]
if version_arg.startswith("v"):
    version_arg = version_arg[1:]
installed_version_info = None
PASSED = True

try:
    print('aws-iam-authenticator version')
    installed_version_info = json.load(
        os.popen('aws-iam-authenticator version'))
    print(
        f'installed version: {installed_version_info["Version"]}')
except Exception as ex:
    sys.exit('aws-iam-authenticator not installed')

try:
    installed_version = installed_version_info['Version']
    # NOT Match
    if version_arg[0] == '!':
        undesired_version = version_arg[1:]
        print(f'undesired version: {undesired_version}')
        if installed_version == undesired_version:
            print(
                f'installed version ({installed_version}) matches undesire {undesired_version} - FAIL')
            PASSED = False
    # Exact Match
    else:
        if version_arg == 'latest':
            print('checking latest version')
            desired_version = get_latest_version()
        else:
            desired_version = version_arg

        print(f'desired version: {desired_version}')
        if installed_version != desired_version:
            print(
                f'installed version ({installed_version}) does not match desired ({desired_version}) - FAIL')
            PASSED = False
except Exception as ex:
    print(f'Exception: {ex}')
    pass

if not PASSED:
    sys.exit('Setting up of '+version_arg+' aws-iam-authenticator failed')
print('Test passed')
sys.exit()
