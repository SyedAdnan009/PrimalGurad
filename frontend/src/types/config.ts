export interface Config {
  thresholds: {
    critical: number;
    high: number;
    medium: number;
  };
  whitelist: {
    ips: string[];
    domains: string[];
  };
  modules: {
    phishing: boolean;
    brute_force: boolean;
    malware: boolean;
  };
}

export interface ConfigUpdateRequest {
  thresholds?: Partial<Config['thresholds']>;
  whitelist?: Partial<Config['whitelist']>;
  modules?: Partial<Config['modules']>;
}

export const getDefaultConfig = (): Config => ({
  thresholds: {
    critical: 90,
    high: 70,
    medium: 40,
  },
  whitelist: {
    ips: ['192.168.1.0/24', '10.0.0.0/8'],
    domains: ['company.com', 'trusted-partner.org'],
  },
  modules: {
    phishing: true,
    brute_force: true,
    malware: true,
  },
});