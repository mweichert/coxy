import { HttpService } from '@nestjs/axios';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { API_KEYS_STORAGE, IApiKeysStorage } from '_/shared/api-keys';
import { toHeaders } from '_/shared/utils';
import { Request, Response } from 'express';
import { lastValueFrom } from 'rxjs';
import { TokenResolverService } from './token-resolver.service';

@Injectable()
export class ProxyService {
  private readonly logger = new Logger(ProxyService.name);
  private readonly copilotApiUrl: string;
  private readonly globalPrefix: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly tokenResolver: TokenResolverService,
    private readonly configService: ConfigService,
    @Inject(API_KEYS_STORAGE) private readonly apiKeysStorage: IApiKeysStorage,
  ) {
    this.copilotApiUrl = this.configService.get<string>('github.copilot.copilotApiUrl');
    this.globalPrefix = this.configService.get<string>('api.prefix');
  }

  async proxyRequest(req: Request, res: Response) {
    try {
      const body = req.method === 'GET' || req.method === 'HEAD' ? undefined : req.body;

      const headers = await this.getHeaders(req);

      const copilotResponse = await lastValueFrom(
        this.httpService.request({
          method: req.method,
          url: this.getTargetUrl(req).href,
          data: body,
          headers,
          responseType: 'stream',
        }),
      );

      res.setHeader('content-type', copilotResponse.headers['content-type']);
      copilotResponse.data.pipe(res);
    } catch (error) {
      const status = error.response?.status || 500;
      const message = error.message || 'Internal Server Error';
      this.logger.error(`Error proxying request to Copilot: ${error.message}`, message, error.stack);
      res.status(status).json({ message });
    }
  }

  private getTargetUrl(req: Request): URL {
    const originalUrl = req.originalUrl.replace(this.globalPrefix, '').replace('//', '/');
    const targetUrl = new URL(originalUrl, this.copilotApiUrl);
    return targetUrl;
  }

  private async getHeaders(req: Request) {
    const headers = {
      ...toHeaders(req.headers),
      ...(this.configService.get<Record<string, string>>('github.copilot.headers') ?? {}),
    } as Record<string, string>;

    const pathname = this.getTargetUrl(req).pathname;
    const isChatCompletions = pathname.startsWith('/chat/completions');
    const isModels = pathname.startsWith('/models');

    if (isChatCompletions) {
      const { token } = await this.tokenResolver.resolveCopilotToken(req);
      headers.authorization = `Bearer ${token}`;

      const contentLength = Buffer.byteLength(JSON.stringify(req.body), 'utf8');
      headers['content-length'] = contentLength.toString();
    } else if (isModels) {
      // For public /models endpoint, use default API key
      const defaultApiKey = await this.apiKeysStorage.getDefault();
      if (defaultApiKey) {
        const { token } = await this.tokenResolver.resolveCopilotTokenFromKey(defaultApiKey.key);
        headers.authorization = `Bearer ${token}`;
      }
    }

    return headers;
  }
}
