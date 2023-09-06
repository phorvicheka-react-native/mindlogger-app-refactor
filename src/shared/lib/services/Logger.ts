import { Dirs, FileSystem } from 'react-native-file-access';
import { FileLogger, LogLevel } from 'react-native-file-logger';

import { FileService } from '@app/shared/api';

import { IS_ANDROID, IS_IOS } from '../constants';
import { ILogger } from '../types';
import { IMutex, Mutex, callWithMutex, isAppOnline } from '../utils';

type NamePath = {
  fileName: string;
  filePath: string;
};

type NamePathSize = {
  size: number;
} & NamePath;

type FileExists = {
  exists: boolean;
} & NamePathSize;

class Logger implements ILogger {
  private mutex: IMutex;

  private abortController: AbortController;

  private consoleLogLevel: LogLevel;

  constructor() {
    this.mutex = Mutex();
    this.abortController = new AbortController();
    this.consoleLogLevel = LogLevel.Debug; // for developers
  }

  private get isAborted(): boolean {
    return this.abortController.signal.aborted;
  }

  private isNamedAsLatest(name: string) {
    return name.toLowerCase().includes('latest');
  }

  private async getLogFiles(): Promise<NamePathSize[]> {
    const filePaths = await FileLogger.getLogFilePaths();

    const result: Array<NamePathSize> = [];

    for (let path of filePaths) {
      const fileInfo = await FileSystem.stat(path);
      result.push({
        fileName: fileInfo.filename,
        filePath: path,
        size: fileInfo.size,
      });
    }

    if (IS_IOS) {
      return result;
    } else {
      const latest = result.find(x => this.isNamedAsLatest(x.fileName))!;

      const rest = result.filter(x => x !== latest);

      const sorted = rest.sort((x, y) => (x.fileName > y.fileName ? -1 : 1));

      return latest ? [latest, ...sorted] : sorted;
    }
  }

  private async checkIfFilesExist(
    files: Array<NamePath>,
  ): Promise<FileExists[]> {
    const checkResult = await FileService.checkIfLogsExist({
      filesToCheck: files.map(x => x.fileName),
    });

    const result: FileExists[] = [];

    for (let existRecord of checkResult.data.result.files) {
      const fileInfo = files.find(x => x.fileName === existRecord.fileName)!;
      result.push({
        ...fileInfo,
        exists: existRecord.exists,
        size: existRecord.size,
      });
    }

    return result;
  }

  private async sendInternal(): Promise<boolean> {
    let logFiles: NamePathSize[];

    try {
      logFiles = await this.getLogFiles();
    } catch (error) {
      console.warn(
        '[Logger.getLogFiles]: Error occurred\n\n',
        error!.toString(),
      );
      return false;
    }

    if (this.isAborted) {
      return false;
    }

    let checkResult: FileExists[];

    try {
      checkResult = await this.checkIfFilesExist(
        logFiles.map<NamePath>(x => ({
          fileName: x.fileName,
          filePath: x.filePath,
        })),
      );
    } catch (error) {
      console.warn(
        '[Logger.checkIfFilesExist]: Error occurred\n\n',
        error!.toString(),
      );
      return false;
    }

    let success = true;

    for (let checkRecord of checkResult) {
      if (this.isAborted) {
        return false;
      }

      const file: NamePathSize = logFiles.find(
        x => x.fileName === checkRecord.fileName,
      )!;

      const isExist = checkRecord.exists;

      const isSizeTheSame = checkRecord.size === file.size;

      const isCurrentLogInAndroid = this.isNamedAsLatest(checkRecord.fileName);

      const shouldUpload =
        !isExist ||
        (isExist && IS_ANDROID && isCurrentLogInAndroid) ||
        (isExist && IS_IOS && !isSizeTheSame);

      if (!shouldUpload) {
        continue;
      }

      try {
        console.info(
          `[Logger.sendInternal] Sending log file "${checkRecord.fileName}"`,
        );

        await FileService.upload(
          {
            fileName: checkRecord.fileName,
            uri: checkRecord.filePath,
            type: 'log',
            fileId: '',
          },
          'log',
        );
      } catch (error) {
        console.warn(
          `[Logger.upload]: Error occurred while sending file "${checkRecord.fileName}"\n\n`,
          error!.toString(),
        );
        success = false;
      }
    }

    return success;
  }

  // PUBLIC

  public configure(logLevel: LogLevel = LogLevel.Debug) {
    const documentDir = Dirs.DocumentDir;

    const logsDir = `${documentDir}/Logs`;

    FileLogger.configure({
      maximumFileSize: 1024, // 1 KB, todo - 1MB after integration
      maximumNumberOfFiles: 5,
      captureConsole: false,
      dailyRolling: true,
      logsDirectory: logsDir,
      logLevel: logLevel,
    });
  }

  public async clearAllLogFiles() {
    try {
      await callWithMutex(this.mutex, FileLogger.deleteLogFiles);
    } catch (error) {
      console.warn(
        'Logger.clearAllLogFiles]: Error occurred\n\n',
        error!.toString(),
      );
    }
  }

  public log(message: string) {
    if (this.consoleLogLevel <= LogLevel.Debug) {
      console.log(message);
    }

    callWithMutex(this.mutex, () => FileLogger.debug(message));
  }

  public info(message: string) {
    if (this.consoleLogLevel <= LogLevel.Info) {
      console.info(message);
    }

    callWithMutex(this.mutex, () => FileLogger.info(message));
  }

  public warn(message: string) {
    if (this.consoleLogLevel <= LogLevel.Warning) {
      console.warn(message);
    }

    callWithMutex(this.mutex, () => FileLogger.warn(message));
  }

  public error(message: string) {
    if (this.consoleLogLevel <= LogLevel.Error) {
      console.error(message);
    }

    callWithMutex(this.mutex, () => FileLogger.error(message));
  }

  public async send(): Promise<boolean> {
    const isOnline = await isAppOnline();
    if (!isOnline) {
      return false;
    }

    if (this.mutex.isBusy()) {
      return false;
    }

    try {
      this.mutex.setBusy();

      this.abortController = new AbortController();

      console.info('[Logger.send] Started sending log files to Server');

      // TODO - uncomment the lines below when integration is done!

      // const result = await this.sendInternal();

      console.info('[Logger.send] Completed sending log files to Server');

      return true; // result; - todo - uncomment
    } catch (error) {
      console.warn(
        '[Logger.sendInternal]: Error occurred: \n\n',
        error!.toString(),
      );
    } finally {
      this.mutex.release();
    }
    return false;
  }

  public cancelSending(reason: string): void {
    this.abortController.abort(reason);
  }
}

export default new Logger();