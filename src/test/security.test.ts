import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { globSync } from 'fs';

const ROOT = join(__dirname, '../..');

describe('Security: .gitignore', () => {
  it('.gitignore exists', () => {
    expect(existsSync(join(ROOT, '.gitignore'))).toBe(true);
  });

  it('.gitignore excludes .env files', () => {
    const gitignore = readFileSync(join(ROOT, '.gitignore'), 'utf-8');
    expect(gitignore).toContain('.env');
    expect(gitignore).toContain('.env.local');
  });

  it('.gitignore excludes node_modules', () => {
    const gitignore = readFileSync(join(ROOT, '.gitignore'), 'utf-8');
    expect(gitignore).toContain('node_modules');
  });

  it('.gitignore excludes dist', () => {
    const gitignore = readFileSync(join(ROOT, '.gitignore'), 'utf-8');
    expect(gitignore).toContain('dist');
  });
});

describe('Security: No hardcoded secrets in source', () => {
  function getSourceFiles(): string[] {
    const files: string[] = [];
    const srcDir = join(ROOT, 'src');

    function walk(dir: string) {
      const { readdirSync, statSync } = require('fs');
      for (const entry of readdirSync(dir)) {
        const full = join(dir, entry);
        if (statSync(full).isDirectory()) {
          if (entry !== 'node_modules' && entry !== 'test') walk(full);
        } else if (/\.(ts|tsx|js|jsx)$/.test(entry)) {
          files.push(full);
        }
      }
    }
    walk(srcDir);
    return files;
  }

  it('no source file contains hardcoded Supabase URLs', () => {
    for (const file of getSourceFiles()) {
      const content = readFileSync(file, 'utf-8');
      // Supabase URLs should come from env vars, not hardcoded
      const hasHardcodedUrl = /https:\/\/[a-z]+\.supabase\.co/.test(content);
      if (hasHardcodedUrl) {
        // Allow it only in the supabase.ts client file if it reads from env
        if (file.includes('supabase.ts')) {
          expect(content).toContain('import.meta.env');
        } else {
          expect(hasHardcodedUrl).toBe(false);
        }
      }
    }
  });

  it('no source file contains service_role key usage', () => {
    for (const file of getSourceFiles()) {
      const content = readFileSync(file, 'utf-8');
      expect(content).not.toContain('service_role');
      expect(content).not.toContain('SUPABASE_SERVICE_ROLE');
    }
  });

  it('supabase client uses environment variables', () => {
    const supabaseClient = readFileSync(join(ROOT, 'src/app/lib/supabase.ts'), 'utf-8');
    expect(supabaseClient).toContain('import.meta.env.VITE_SUPABASE_URL');
    expect(supabaseClient).toContain('import.meta.env.VITE_SUPABASE_ANON_KEY');
    expect(supabaseClient).not.toContain('service_role');
  });
});

describe('Security: Vite build config', () => {
  it('source maps are disabled in production', () => {
    const viteConfig = readFileSync(join(ROOT, 'vite.config.ts'), 'utf-8');
    expect(viteConfig).toContain('sourcemap: false');
  });
});

describe('Security: No dangerouslySetInnerHTML with user input', () => {
  function getSourceFiles(): string[] {
    const files: string[] = [];
    const srcDir = join(ROOT, 'src/app/pages');

    function walk(dir: string) {
      const { readdirSync, statSync } = require('fs');
      for (const entry of readdirSync(dir)) {
        const full = join(dir, entry);
        if (statSync(full).isDirectory()) walk(full);
        else if (/\.(tsx|jsx)$/.test(entry)) files.push(full);
      }
    }
    if (existsSync(srcDir)) walk(srcDir);
    return files;
  }

  it('no page component uses dangerouslySetInnerHTML', () => {
    for (const file of getSourceFiles()) {
      const content = readFileSync(file, 'utf-8');
      expect(content).not.toContain('dangerouslySetInnerHTML');
    }
  });
});

describe('Security: Environment variable validation', () => {
  it('supabase.ts validates env vars on load', () => {
    const content = readFileSync(join(ROOT, 'src/app/lib/supabase.ts'), 'utf-8');
    expect(content).toContain('!supabaseUrl');
    expect(content).toContain('!supabaseAnonKey');
  });
});
