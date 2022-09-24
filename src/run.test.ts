import * as run from './run'
import {
   getiamAuthDownloadURL,
   getiamAuthArch,
   getExecutableExtension
} from './helpers'
import * as os from 'os'
import * as toolCache from '@actions/tool-cache'
import * as fs from 'fs'
import * as path from 'path'
import * as core from '@actions/core'
import * as util from 'util'

describe('Testing all functions in run file.', () => {
   test('getExecutableExtension() - return .exe when os is Windows', () => {
      jest.spyOn(os, 'type').mockReturnValue('Windows_NT')

      expect(getExecutableExtension()).toBe('.exe')
      expect(os.type).toBeCalled()
   })

   test('getExecutableExtension() - return empty string for non-windows OS', () => {
      jest.spyOn(os, 'type').mockReturnValue('Darwin')

      expect(getExecutableExtension()).toBe('')
      expect(os.type).toBeCalled()
   })

   test.each([
      ['arm', 'arm'],
      ['arm64', 'arm64'],
      ['x64', 'amd64']
   ])(
      'getiamAuthArch() - return on %s os arch %s aws-iam-authenticator arch',
      (osArch, iamAuthArch) => {
         jest.spyOn(os, 'arch').mockReturnValue(osArch)

         expect(getiamAuthArch()).toBe(iamAuthArch)
         expect(os.arch).toBeCalled()
      }
   )

   test.each([['arm'], ['arm64'], ['amd64']])(
      'getiamAuthDownloadURL() - return the URL to download %s aws-iam-authenticator for Linux',
      (arch) => {
         jest.spyOn(os, 'type').mockReturnValue('Linux')
         const iamAuthLinuxUrl = util.format(
            'https://github.com/kubernetes-sigs/aws-iam-authenticator/releases/download/v0.5.9/aws-iam-authenticator_0.5.9_linux_%s',
            arch
         )

         expect(getiamAuthDownloadURL('0.5.9', arch)).toBe(iamAuthLinuxUrl)
         expect(os.type).toBeCalled()
      }
   )

   test.each([['arm'], ['arm64'], ['amd64']])(
      'getiamAuthDownloadURL() - return the URL to download %s aws-iam-authenticator for Darwin',
      (arch) => {
         jest.spyOn(os, 'type').mockReturnValue('Darwin')
         const iamAuthDarwinUrl = util.format(
            'https://github.com/kubernetes-sigs/aws-iam-authenticator/releases/download/v0.5.9/aws-iam-authenticator_0.5.9_darwin_%s',
            arch
         )

         expect(getiamAuthDownloadURL('0.5.9', arch)).toBe(iamAuthDarwinUrl)
         expect(os.type).toBeCalled()
      }
   )

   test.each([['arm'], ['arm64'], ['amd64']])(
      'getiamAuthDownloadURL() - return the URL to download %s aws-iam-authenticator for Windows',
      (arch) => {
         jest.spyOn(os, 'type').mockReturnValue('Windows_NT')

         const iamAuthWindowsUrl = util.format(
            'https://github.com/kubernetes-sigs/aws-iam-authenticator/releases/download/v0.5.9/aws-iam-authenticator_0.5.9_windows_%s.exe',
            arch
         )
         expect(getiamAuthDownloadURL('0.5.9', arch)).toBe(iamAuthWindowsUrl)
         expect(os.type).toBeCalled()
      }
   )

   test('getStableiamAuthVersion() - download stable version file, read version and return it', async () => {
      jest
         .spyOn(toolCache, 'downloadTool')
         .mockReturnValue(Promise.resolve('pathToTool'))
      jest.spyOn(fs, 'readFileSync').mockReturnValue('{"tag_name":"v0.5.9"}')

      expect(await run.getStableiamAuthVersion()).toBe('0.5.9')
      expect(toolCache.downloadTool).toBeCalled()
      expect(fs.readFileSync).toBeCalledWith('pathToTool', 'utf8')
   })

   test('getStableiamAuthVersion() - return default v0.5.9 if version read is empty', async () => {
      jest
         .spyOn(toolCache, 'downloadTool')
         .mockReturnValue(Promise.resolve('pathToTool'))
      jest.spyOn(fs, 'readFileSync').mockReturnValue('{}')

      expect(await run.getStableiamAuthVersion()).toBe('0.5.9')
      expect(toolCache.downloadTool).toBeCalled()
      expect(fs.readFileSync).toBeCalledWith('pathToTool', 'utf8')
   })

   test('getStableiamAuthVersion() - return default v0.5.9 if unable to download file', async () => {
      jest
         .spyOn(toolCache, 'downloadTool')
         .mockRejectedValue('Unable to download.')

      expect(await run.getStableiamAuthVersion()).toBe('0.5.9')
      expect(toolCache.downloadTool).toBeCalled()
   })

   test('downloadiamAuth() - download aws-iam-authenticator, add it to toolCache and return path to it', async () => {
      jest.spyOn(toolCache, 'find').mockReturnValue('')
      jest
         .spyOn(toolCache, 'downloadTool')
         .mockReturnValue(Promise.resolve('pathToTool'))
      jest
         .spyOn(toolCache, 'cacheFile')
         .mockReturnValue(Promise.resolve('pathToCachedTool'))
      jest.spyOn(os, 'type').mockReturnValue('Windows_NT')
      jest.spyOn(fs, 'chmodSync').mockImplementation(() => {})

      expect(await run.downloadiamAuth('0.5.9')).toBe(
         path.join('pathToCachedTool', 'aws-iam-authenticator.exe')
      )
      expect(toolCache.find).toBeCalledWith('aws-iam-authenticator', '0.5.9')
      expect(toolCache.downloadTool).toBeCalled()
      expect(toolCache.cacheFile).toBeCalled()
      expect(os.type).toBeCalled()
      expect(fs.chmodSync).toBeCalledWith(
         path.join('pathToCachedTool', 'aws-iam-authenticator.exe'),
         '775'
      )
   })

   test('downloadiamAuth() - throw DownloadiamAuthFailed error when unable to download aws-iam-authenticator', async () => {
      jest.spyOn(toolCache, 'find').mockReturnValue('')
      jest
         .spyOn(toolCache, 'downloadTool')
         .mockRejectedValue('Unable to download aws-iam-authenticator.')

      await expect(run.downloadiamAuth('0.5.9')).rejects.toThrow(
         'DownloadiamAuthFailed'
      )
      expect(toolCache.find).toBeCalledWith('aws-iam-authenticator', '0.5.9')
      expect(toolCache.downloadTool).toBeCalled()
   })

   test('downloadiamAuth() - throw aws-iam-authenticator not found error when receive 404 response', async () => {
      const iamAuthVersion = '0.6.9'
      const arch = 'arm128'

      jest.spyOn(os, 'arch').mockReturnValue(arch)
      jest.spyOn(toolCache, 'find').mockReturnValue('')
      jest.spyOn(toolCache, 'downloadTool').mockImplementation((_) => {
         throw new toolCache.HTTPError(404)
      })

      await expect(run.downloadiamAuth(iamAuthVersion)).rejects.toThrow(
         util.format(
            "aws-iam-authenticator '%s' for '%s' arch not found.",
            iamAuthVersion,
            arch
         )
      )
      expect(os.arch).toBeCalled()
      expect(toolCache.find).toBeCalledWith(
         'aws-iam-authenticator',
         iamAuthVersion
      )
      expect(toolCache.downloadTool).toBeCalled()
   })

   test('downloadiamAuth() - return path to existing cache of aws-iam-authenticator', async () => {
      jest.spyOn(toolCache, 'find').mockReturnValue('pathToCachedTool')
      jest.spyOn(os, 'type').mockReturnValue('Windows_NT')
      jest.spyOn(fs, 'chmodSync').mockImplementation(() => {})
      jest.spyOn(toolCache, 'downloadTool')

      expect(await run.downloadiamAuth('0.5.9')).toBe(
         path.join('pathToCachedTool', 'aws-iam-authenticator.exe')
      )
      expect(toolCache.find).toBeCalledWith('aws-iam-authenticator', '0.5.9')
      expect(os.type).toBeCalled()
      expect(fs.chmodSync).toBeCalledWith(
         path.join('pathToCachedTool', 'aws-iam-authenticator.exe'),
         '775'
      )
      expect(toolCache.downloadTool).not.toBeCalled()
   })

   test('run() - download specified version and set output', async () => {
      jest.spyOn(core, 'getInput').mockReturnValue('0.5.9')
      jest.spyOn(toolCache, 'find').mockReturnValue('pathToCachedTool')
      jest.spyOn(os, 'type').mockReturnValue('Windows_NT')
      jest.spyOn(fs, 'chmodSync').mockImplementation()
      jest.spyOn(core, 'addPath').mockImplementation()
      jest.spyOn(console, 'log').mockImplementation()
      jest.spyOn(core, 'setOutput').mockImplementation()

      expect(await run.run()).toBeUndefined()
      expect(core.getInput).toBeCalledWith('version', {required: true})
      expect(core.addPath).toBeCalledWith('pathToCachedTool')
      expect(core.setOutput).toBeCalledWith(
         'aws-iam-authenticator-path',
         path.join('pathToCachedTool', 'aws-iam-authenticator.exe')
      )
   })

   test('run() - get latest version, download it and set output', async () => {
      jest.spyOn(core, 'getInput').mockReturnValue('latest')
      jest
         .spyOn(toolCache, 'downloadTool')
         .mockReturnValue(Promise.resolve('pathToTool'))
      jest.spyOn(fs, 'readFileSync').mockReturnValue('{"tag_name":"v0.5.9"}')
      jest.spyOn(toolCache, 'find').mockReturnValue('pathToCachedTool')
      jest.spyOn(os, 'type').mockReturnValue('Windows_NT')
      jest.spyOn(fs, 'chmodSync').mockImplementation()
      jest.spyOn(core, 'addPath').mockImplementation()
      jest.spyOn(console, 'log').mockImplementation()
      jest.spyOn(core, 'setOutput').mockImplementation()

      expect(await run.run()).toBeUndefined()
      expect(toolCache.downloadTool).toBeCalledWith(
         'https://github.com/kubernetes-sigs/aws-iam-authenticator/releases/latest',
         undefined,
         undefined,
         {accept: 'application/json'}
      )
      expect(core.getInput).toBeCalledWith('version', {required: true})
      expect(core.addPath).toBeCalledWith('pathToCachedTool')
      expect(core.setOutput).toBeCalledWith(
         'aws-iam-authenticator-path',
         path.join('pathToCachedTool', 'aws-iam-authenticator.exe')
      )
   })
})
