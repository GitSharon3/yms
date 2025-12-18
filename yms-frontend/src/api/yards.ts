import { http } from './http';

export type Yard = {
  id: string;
  name: string;
  address?: string | null;
  createdAtUtc: string;
};

export type CreateYardRequest = {
  name: string;
  address?: string | null;
};

export async function getYards(): Promise<Yard[]> {
  return http<Yard[]>('/api/yards');
}

export async function createYard(payload: CreateYardRequest): Promise<Yard> {
  return http<Yard>('/api/yards', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
