import * as path from 'path'
import * as util from 'util'
import * as fs from 'fs'

import * as toolCache from '@actions/tool-cache'
import * as core from '@actions/core'

import {
   getiamAuthDownloadURL,
   getiamAuthArch,
   getExecutableExtension
} from './helpers'

const iamAuthToolName = 'aws-iam-authenticator'
const stableiamAuthVersion = '0.5.9'
const stableVersionUrl =
   'https://github.com/kubernetes-sigs/aws-iam-authenticator/releases/latest'

export async function run() {
   let version = core.getInput('version', {required: true})
   if (version.toLocaleLowerCase() === 'latest') {
      version = await getStableiamAuthVersion()
   } else if (version.startsWith('v')) {
      version = version.slice(1)
   }
   const cachedPath = await downloadiamAuth(version)

   core.addPath(path.dirname(cachedPath))

   core.debug(
      `aws-iam-authenticator tool version: '${version}' has been cached at ${cachedPath}`
   )
   core.setOutput('aws-iam-authenticator-path', cachedPath)
}

export async function getStableiamAuthVersion(): Promise<string> {
   return toolCache
      .downloadTool(stableVersionUrl, undefined, undefined, {
         accept: 'application/json'
      })
      .then(
         (downloadPath) => {
            let version = JSON.parse(
               fs.readFileSync(downloadPath, 'utf8')
            ).tag_name?.slice(1)
            if (!version) {
               version = stableiamAuthVersion
            }
            return version
         },
         (error) => {
            core.debug(error)
            core.warning('GetStableVersionFailed')
            return stableiamAuthVersion
         }
      )
}

export async function downloadiamAuth(version: string): Promise<string> {
   let cachedToolpath = toolCache.find(iamAuthToolName, version)
   let iamAuthDownloadPath = ''
   const arch = getiamAuthArch()
   if (!cachedToolpath) {
      try {
         iamAuthDownloadPath = await toolCache.downloadTool(
            getiamAuthDownloadURL(version, arch)
         )
      } catch (exception) {
         if (
            exception instanceof toolCache.HTTPError &&
            exception.httpStatusCode === 404
         ) {
            throw new Error(
               util.format(
                  "aws-iam-authenticator '%s' for '%s' arch not found.",
                  version,
                  arch
               )
            )
         } else {
            throw new Error('DownloadiamAuthFailed')
         }
      }

      cachedToolpath = await toolCache.cacheFile(
         iamAuthDownloadPath,
         iamAuthToolName + getExecutableExtension(),
         iamAuthToolName,
         version
      )
   }

   const iamAuthPath = path.join(
      cachedToolpath,
      iamAuthToolName + getExecutableExtension()
   )
   fs.chmodSync(iamAuthPath, '775')
   return iamAuthPath
}

run().catch(core.setFailed)
