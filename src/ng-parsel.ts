import { tsquery } from '@phenomnomnominal/tsquery';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import * as glob from 'glob';

import { investigateType } from './investigator';
import { parseSpec } from './parser/spec/spec.parser';
import { parsePipe } from './parser/pipe/pipe.parser';
import { parseModule } from './parser/module/module.parser';
import { parseDirective } from './parser/directive/directive.parser';
import { parseComponent } from './parser/component/component.parser';
import { NgParselBuildingBlockType } from './parser/shared/model/types.model';
import { NgParselConfig } from './config/config.model';
import { NgParselComponent } from './parser/component/component.model';
import { NgParselModule } from './parser/module/module.model';
import { NgParselDirective } from './parser/directive/directive.model';
import { NgParselSpec } from './parser/spec/spec.model';
import { NgParselPipe } from './parser/pipe/pipe.model';
import { generateSpinner } from './utils/spinner.util';

export function parse(configuration: NgParselConfig): void {
  const directoryGlob = `${configuration.src}/**/*.{ts,html,scss,css,less}`;

  let ngParselComponents: NgParselComponent[] = [],
    ngParselSpecs: NgParselSpec[] = [],
    ngParselPipes: NgParselPipe[] = [],
    ngParselModules: NgParselModule[] = [],
    ngParselDirectives: NgParselDirective[] = [];

  const parseSpinner = generateSpinner('Parsing files');
  try {
    parseSpinner.start();

    glob.sync(directoryGlob).forEach((filePath) => {
      const source = readFileSync(filePath, 'utf8');
      const ast = tsquery.ast(source);
      const componentType = investigateType(ast, filePath);

      if (configuration.parseComponents && componentType === NgParselBuildingBlockType.COMPONENT) {
        ngParselComponents.push(parseComponent(ast, filePath));
      }

      if (configuration.parseSpecs && componentType === NgParselBuildingBlockType.SPEC) {
        ngParselSpecs.push(parseSpec(ast, filePath));
      }

      if (configuration.parseModules && componentType === NgParselBuildingBlockType.MODULE) {
        ngParselModules.push(parseModule(ast));
      }

      if (configuration.parseDirectives && componentType === NgParselBuildingBlockType.DIRECTIVE) {
        ngParselDirectives.push(parseDirective(ast, filePath));
      }

      if (configuration.parsePipes && componentType === NgParselBuildingBlockType.PIPE) {
        ngParselPipes.push(parsePipe(ast, filePath));
      }
    });
    parseSpinner.succeed('Files successfully parsed');
  } catch (e) {
    parseSpinner.fail(`Failed to parse files: ${e}`);
  }

  const writeOutputSpinner = generateSpinner('Write output files');
  try {
    writeOutputSpinner.start();

    writeOutputFiles(configuration, ngParselComponent, ngParselDirective, ngParselModule, ngParselSpec, ngParselPipe);

    writeOutputSpinner.succeed(`Files successfully written to ${configuration.out}`);
  } catch (e) {
    writeOutputSpinner.fail(`Failed to write output files: ${e}`);
  }
}

function writeOutputFiles(
  config: NgParselConfig,
  ngParselComponent: NgParselComponent | undefined,
  ngParselDirective: NgParselDirective | undefined,
  ngParselModule: NgParselModule | undefined,
  ngParselSpec: NgParselSpec | undefined,
  ngParselPipe: NgParselPipe | undefined
): void {
  if (config.singleFile) {
    if (!existsSync(config.out as string)) {
      mkdirSync(config.out as string, { recursive: true });
    }

    writeFileSync(
      `${config.out}/ng-parsel.json`,
      JSON.stringify({
        ...ngParselComponent,
        ...ngParselModule,
        ...ngParselDirective,
        ...ngParselDirective,
      })
    );
  } else {
    if (ngParselComponent) {
      writeFileSync(`${config.out}/ng-parsel-component.json`, JSON.stringify(ngParselComponent));
    }

    if (ngParselModule) {
      writeFileSync(`${config.out}/ng-parsel-module.json`, JSON.stringify(ngParselModule));
    }

    if (ngParselDirective) {
      writeFileSync(`${config.out}/ng-parsel-directive.json`, JSON.stringify(ngParselDirective));
    }

    if (ngParselPipe) {
      writeFileSync(`${config.out}/ng-parsel-pipe.json`, JSON.stringify(ngParselPipe));
    }

    if (ngParselSpec) {
      writeFileSync(`${config.out}/ng-parsel-spec.json`, JSON.stringify(ngParselSpec));
    }
  }
}
