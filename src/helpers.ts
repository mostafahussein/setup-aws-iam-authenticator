import * as os from 'os'
import * as util from 'util'

export function getiamAuthArch(): string {
   const arch = os.arch()
   if (arch === 'x64') {
      return 'amd64'
   }
   return arch
}

export function getiamAuthDownloadURL(version: string, arch: string): string {
   switch (os.type()) {
      case 'Linux':
         return util.format(
            'https://github.com/kubernetes-sigs/aws-iam-authenticator/releases/download/v%s/aws-iam-authenticator_%s_linux_%s',
            version,
            version,
            arch
         )

      case 'Darwin':
         return util.format(
            'https://github.com/kubernetes-sigs/aws-iam-authenticator/releases/download/v%s/aws-iam-authenticator_%s_darwin_%s',
            version,
            version,
            arch
         )

      case 'Windows_NT':
      default:
         return util.format(
            'https://github.com/kubernetes-sigs/aws-iam-authenticator/releases/download/v%s/aws-iam-authenticator_%s_windows_%s.exe',
            version,
            version,
            arch
         )
   }
}

export function getExecutableExtension(): string {
   if (os.type().match(/^Win/)) {
      return '.exe'
   }
   return ''
}
