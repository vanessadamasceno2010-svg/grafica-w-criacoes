import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

import { config } from '../config.js';
import { HttpError } from '../utils/http.js';

function isInvalidJsonError(err: unknown) {
  return err instanceof SyntaxError && 'body' in (err as any);
}

function isCorsError(err: unknown) {
  return err instanceof Error && err.message === 'Origem não permitida pelo servidor.';
}

function shouldShowDetails(status: number) {
  // Erros abaixo de 500 geralmente são erros esperados:
  // login inválido, dados inválidos, sem permissão etc.
  return !config.isProduction || status < 500;
}

export function notFound(req: Request, _res: Response, next: NextFunction) {
  next(
    new HttpError(404, 'Rota não encontrada.', {
      method: req.method,
      path: req.path,
    })
  );
}

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (res.headersSent) {
    return next(err);
  }

  if (err instanceof ZodError) {
    return res.status(422).json({
      message: 'Dados inválidos.',
      errors: err.flatten(),
    });
  }

  if (isInvalidJsonError(err)) {
    return res.status(400).json({
      message: 'JSON inválido. Verifique os dados enviados.',
    });
  }

  if (isCorsError(err)) {
    return res.status(403).json({
      message: 'Origem não permitida pelo servidor.',
    });
  }

  if (err instanceof HttpError) {
    const body: Record<string, unknown> = {
      message: err.message,
    };

    if (err.details && shouldShowDetails(err.status)) {
      body.details = err.details;
    }

    return res.status(err.status).json(body);
  }

  if (config.isProduction) {
    console.error('ERRO INTERNO:', {
      method: req.method,
      path: req.path,
      message: err instanceof Error ? err.message : 'Erro desconhecido',
    });
  } else {
    console.error(err);
  }

  return res.status(500).json({
    message: 'Erro interno do servidor.',
  });
}
