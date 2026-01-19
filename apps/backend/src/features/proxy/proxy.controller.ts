import { Controller, Get, Post, Req, Res, UseGuards } from '@nestjs/common';
import { Request, Response } from 'express';
import { ApiKeyGuard } from '../api-keys/guards/api-key.guard';
import { ProxyService } from './proxy.service';

// Static list of known GitHub Copilot models (OpenAI-compatible format)
const STATIC_MODELS = {
  object: 'list',
  data: [
    { id: 'gpt-4o', object: 'model', created: 1715367049, owned_by: 'system' },
    { id: 'gpt-4o-mini', object: 'model', created: 1715367049, owned_by: 'system' },
    { id: 'gpt-4.1', object: 'model', created: 1715367049, owned_by: 'system' },
    { id: 'gpt-4.1-mini', object: 'model', created: 1715367049, owned_by: 'system' },
    { id: 'gpt-4-turbo', object: 'model', created: 1715367049, owned_by: 'system' },
    { id: 'gpt-4', object: 'model', created: 1715367049, owned_by: 'system' },
    { id: 'gpt-3.5-turbo', object: 'model', created: 1715367049, owned_by: 'system' },
    { id: 'claude-3.5-sonnet', object: 'model', created: 1715367049, owned_by: 'system' },
    { id: 'claude-3.7-sonnet', object: 'model', created: 1715367049, owned_by: 'system' },
    { id: 'claude-sonnet-4', object: 'model', created: 1715367049, owned_by: 'system' },
    { id: 'o1-preview', object: 'model', created: 1715367049, owned_by: 'system' },
    { id: 'o1-mini', object: 'model', created: 1715367049, owned_by: 'system' },
    { id: 'o3-mini', object: 'model', created: 1715367049, owned_by: 'system' },
  ],
};

@Controller()
export class ProxyController {
  constructor(private readonly proxyService: ProxyService) {}

  @Post('chat/completions')
  @UseGuards(ApiKeyGuard)
  async chatCompletions(@Req() req: Request, @Res() res: Response) {
    return this.proxyService.proxyRequest(req, res);
  }

  @Get('models')
  getModels(@Res() res: Response) {
    // Return static list of models without calling GitHub API
    return res.json(STATIC_MODELS);
  }
}
