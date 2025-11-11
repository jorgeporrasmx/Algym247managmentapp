interface Config {
  supabase: {
    url: string;
    anonKey: string;
  };
  app: {
    url: string;
    environment: 'development' | 'staging' | 'production';
  };
  monday: {
    membersBoardId: number;
    contractsBoardId: number;
  };
}

class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigError';
  }
}

function getRequiredEnvVar(name: string): string {
  const value = process.env[name];
  if (!value || value === '') {
    throw new ConfigError(`Missing required environment variable: ${name}`);
  }
  return value;
}

function validateSupabaseConfig(url: string, key: string): void {
  const invalidValues = [
    'https://your-project.supabase.co',
    'your-anon-key-here',
    'https://dummy.supabase.co',
    'dummy-key'
  ];

  if (invalidValues.includes(url) || invalidValues.includes(key)) {
    console.warn('⚠️ Using placeholder Supabase credentials');
    console.warn('Please update your .env.local with real credentials from:');
    console.warn('https://app.supabase.com/project/YOUR_PROJECT/settings/api');
  }

  if (!url.startsWith('https://') || !url.includes('.supabase.co')) {
    throw new ConfigError('Invalid Supabase URL format');
  }

  if (key.length < 30) {
    throw new ConfigError('Invalid Supabase anon key format');
  }
}

function getEnvironment(): 'development' | 'staging' | 'production' {
  const env = process.env.NODE_ENV;
  if (env === 'production') return 'production';
  if (env === 'test') return 'staging';
  return 'development';
}

export function getConfig(): Config {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  
  try {
    validateSupabaseConfig(supabaseUrl, supabaseAnonKey);
  } catch (error) {
    if (getEnvironment() === 'production') {
      throw error;
    }
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || (
    getEnvironment() === 'development' 
      ? 'http://localhost:3000' 
      : 'https://your-app.vercel.app'
  );

  return {
    supabase: {
      url: supabaseUrl,
      anonKey: supabaseAnonKey,
    },
    app: {
      url: appUrl,
      environment: getEnvironment(),
    },
    monday: {
      membersBoardId: Number(process.env.MONDAY_MEMBERS_BOARD_ID) || 123456789,
      contractsBoardId: Number(process.env.MONDAY_CONTRACTS_BOARD_ID) || 987654321,
    },
  };
}

export function isConfigValid(): boolean {
  try {
    const config = getConfig();
    return !!(config.supabase.url && config.supabase.anonKey);
  } catch {
    return false;
  }
}

export const config = getConfig();