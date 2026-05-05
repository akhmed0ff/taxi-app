import { fetchTariffs, getTariffs } from '../api';

describe('fetchTariffs', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns tariffs on successful response', async () => {
    const payload = [
      { tariffClass: 'STANDARD', minimumFare: 12000, perKm: 2500, baseFare: 8000 },
      { tariffClass: 'COMFORT', minimumFare: 18000, perKm: 3200, baseFare: 10000 },
    ];

    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => payload,
    } as Response);

    await expect(fetchTariffs()).resolves.toEqual(payload);
  });

  it('throws error on network failure', async () => {
    jest.spyOn(global, 'fetch').mockRejectedValue(new Error('Network request failed'));

    await expect(fetchTariffs()).rejects.toThrow('Network request failed');
  });
});

describe('getTariffs', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns public tariffs from /tariffs', async () => {
    const payload = [
      {
        id: 'a',
        code: 'STANDARD',
        title: 'Стандарт',
        isActive: true,
        sortOrder: 1,
        baseFare: 3800,
        pricePerKm: 2000,
        etaMinutes: 5,
        seats: 4,
        minimumFare: 3800,
        freeWaitingMinutes: 3,
        waitingPerMinute: 500,
        stopPerMinute: 500,
      },
    ];

    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => payload,
    } as Response);

    await expect(getTariffs()).resolves.toEqual(payload);
  });
});
