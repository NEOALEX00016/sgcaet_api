import { ServiceUnavailableException } from '@nestjs/common';
import { HealthController } from './health.controller';

describe('HealthController', () => {
  it('reports liveness without requiring the database', () => {
    const controller = new HealthController({} as never);
    expect(controller.health()).toMatchObject({
      status: 'ok',
      service: 'sgcaet-backend',
    });
  });

  it('reports readiness when PostgreSQL responds', async () => {
    const controller = new HealthController({
      options: { schema: 'sgcaet_core' },
      query: jest.fn().mockResolvedValue([{ '?column?': 1 }]),
    } as never);
    await expect(controller.readiness()).resolves.toMatchObject({
      status: 'ready',
      database: 'up',
      schema: 'sgcaet_core',
    });
  });

  it('returns service unavailable when PostgreSQL is down', async () => {
    const controller = new HealthController({
      options: { schema: 'sgcaet_core' },
      query: jest.fn().mockRejectedValue(new Error('db down')),
    } as never);
    await expect(controller.readiness()).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });
});
