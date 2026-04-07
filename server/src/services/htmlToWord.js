const fs = require('fs');
const path = require('path');
const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, HeadingLevel, AlignmentType, BorderStyle, WidthType, ImageRun } = require('docx');
const logger = require('../utils/logger');

class HtmlToWordService {
  constructor() {
    const outputDirConfig = process.env.OUTPUT_DIR || './outputs';
    this.outputDir = path.isAbsolute(outputDirConfig) 
      ? outputDirConfig 
      : path.join(__dirname, '../../..', outputDirConfig);
    
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
  }

  async generateFromHtml(htmlContent, data, filename) {
    try {
      const processedHtml = this.replacePlaceholders(htmlContent, data);
      const doc = await this.htmlToDocx(processedHtml);
      const fullPath = path.join(this.outputDir, filename);
      const buffer = await Packer.toBuffer(doc);
      fs.writeFileSync(fullPath, buffer);
      logger.info(`文档生成成功: ${fullPath}`);
      return { success: true, path: fullPath };
    } catch (error) {
      logger.error('HTML转Word失败:', error);
      return { success: false, error: error.message };
    }
  }

  replacePlaceholders(html, data) {
    let result = html;
    
    // 先处理循环
    const loopRegex = /\{\{#each\s+([^}]+)\}\}([\s\S]*?)\{\{\/each\}\}/g;
    result = result.replace(loopRegex, (match, arrayPath, template) => {
      const array = this.getValueByPath(data, arrayPath.trim());
      logger.info(`循环处理: arrayPath=${arrayPath.trim()}, isArray=${Array.isArray(array)}, length=${array ? array.length : 0}`);
      if (!Array.isArray(array)) return '';
      
      const arrayPathTrimmed = arrayPath.trim();
      
      return array.map((item, index) => {
        if (index === 0) {
          logger.info(`  循环项[${index}] item类型=${typeof item}, item=${JSON.stringify(item).substring(0, 200)}`);
        }
        
        let itemHtml = template;
        itemHtml = itemHtml.replace(/\{\{([^#/][^}]*)\}\}/g, (m, k) => {
          const trimmedK = k.trim();
          let value;
          
          if (trimmedK.startsWith(arrayPathTrimmed + '[].')) {
            const relativePath = trimmedK.substring((arrayPathTrimmed + '[].').length);
            value = this.getValueByPath(item, relativePath);
          } else if (trimmedK.startsWith(arrayPathTrimmed + '[]')) {
            const relativePath = trimmedK.substring((arrayPathTrimmed + '[]').length);
            value = relativePath ? this.getValueByPath(item, relativePath) : item;
          } else if (trimmedK.includes('[]')) {
            const pathParts = trimmedK.split(/\[\]\.?/);
            if (pathParts.length === 2) {
              value = this.getValueByPath(item, pathParts[1] || '');
            } else {
              value = this.getValueByPath(item, trimmedK);
            }
          } else {
            value = this.getValueByPath(item, trimmedK);
          }
          
          if (index === 0) {
            logger.info(`  循环项[${index}] 字段=${trimmedK}, 值=${JSON.stringify(value)}, item是否有此字段=${item && item.hasOwnProperty(trimmedK)}`);
          }
          
          return value !== undefined && value !== null ? String(value) : '';
        });
        return itemHtml;
      }).join('');
    });

    // 再处理条件
    const ifRegex = /\{\{#if\s+([^}]+)\}\}([\s\S]*?)\{\{\/if\}\}/g;
    result = result.replace(ifRegex, (match, condition, content) => {
      const value = this.getValueByPath(data, condition.trim());
      return value ? content : '';
    });

    // 最后处理普通占位符
    const placeholderRegex = /\{\{([^}]+)\}\}/g;
    result = result.replace(placeholderRegex, (match, key) => {
      const trimmedKey = key.trim();
      const value = this.getValueByPath(data, trimmedKey);
      logger.debug(`占位符 {{${trimmedKey}}}: 值 = ${JSON.stringify(value)}`);
      return value !== undefined && value !== null ? String(value) : '';
    });

    return result;
  }

  getValueByPath(obj, path) {
    if (!path) return obj;
    
    logger.info(`getValueByPath: path=${path}, obj类型=${typeof obj}`);
    const tokens = this.tokenizePath(path);
    let current = obj;
    
    for (const token of tokens) {
      if (current === null || current === undefined) {
        logger.info(`getValueByPath: 在token ${JSON.stringify(token)}处返回undefined`);
        return undefined;
      }
      
      if (token.type === 'key') {
        logger.info(`getValueByPath: 访问key=${token.value}`);
        current = current[token.value];
      } else if (token.type === 'array') {
        if (!Array.isArray(current)) {
          logger.info(`getValueByPath: 期望数组但得到${typeof current}`);
          return undefined;
        }
        if (token.index !== undefined) {
          logger.info(`getValueByPath: 访问数组索引=${token.index}`);
          current = current[token.index];
        } else {
          return current;
        }
      }
    }
    
    logger.info(`getValueByPath: 最终结果=${JSON.stringify(current)}`);
    return current;
  }

  tokenizePath(path) {
    const tokens = [];
    let i = 0;
    
    while (i < path.length) {
      if (path[i] === '.') {
        i++;
        continue;
      }
      
      let keyStart = i;
      while (i < path.length && path[i] !== '.' && path[i] !== '[') {
        i++;
      }
      
      if (i > keyStart) {
        tokens.push({ type: 'key', value: path.substring(keyStart, i) });
      }
      
      while (i < path.length && path[i] === '[') {
        i++;
        let indexStr = '';
        while (i < path.length && path[i] !== ']') {
          indexStr += path[i];
          i++;
        }
        if (i < path.length && path[i] === ']') {
          i++;
        }
        
        if (indexStr === '') {
          tokens.push({ type: 'array', index: undefined });
        } else {
          const index = parseInt(indexStr);
          if (!isNaN(index)) {
            tokens.push({ type: 'array', index });
          }
        }
      }
    }
    
    return tokens;
  }

  async htmlToDocx(html) {
    const sections = [];
    const lines = html.split('\n');
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine) continue;
      
      if (trimmedLine.startsWith('<h1>') || trimmedLine.startsWith('<h1 ')) {
        const text = this.stripHtmlTags(trimmedLine);
        sections.push(new Paragraph({
          text,
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 400, after: 200 }
        }));
      } else if (trimmedLine.startsWith('<h2>') || trimmedLine.startsWith('<h2 ')) {
        const text = this.stripHtmlTags(trimmedLine);
        sections.push(new Paragraph({
          text,
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 300, after: 150 }
        }));
      } else if (trimmedLine.startsWith('<h3>') || trimmedLine.startsWith('<h3 ')) {
        const text = this.stripHtmlTags(trimmedLine);
        sections.push(new Paragraph({
          text,
          heading: HeadingLevel.HEADING_3,
          spacing: { before: 200, after: 100 }
        }));
      } else if (trimmedLine.startsWith('<table')) {
        const tableContent = this.parseTable(html, html.indexOf(trimmedLine));
        if (tableContent) {
          sections.push(tableContent);
        }
      } else if (trimmedLine.startsWith('<p>') || trimmedLine.startsWith('<p ')) {
        const text = this.stripHtmlTags(trimmedLine);
        sections.push(new Paragraph({
          children: [new TextRun(text)],
          spacing: { after: 100 }
        }));
      } else if (trimmedLine.startsWith('<div>') || trimmedLine.startsWith('<div ')) {
        const text = this.stripHtmlTags(trimmedLine);
        sections.push(new Paragraph({
          children: [new TextRun(text)],
          spacing: { after: 100 }
        }));
      } else if (!trimmedLine.startsWith('<') && trimmedLine.length > 0) {
        sections.push(new Paragraph({
          children: [new TextRun(trimmedLine)],
          spacing: { after: 100 }
        }));
      }
    }

    return new Document({
      sections: [{
        properties: {},
        children: sections.length > 0 ? sections : [new Paragraph({ children: [new TextRun('')] })]
      }]
    });
  }

  stripHtmlTags(html) {
    return html
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .trim();
  }

  parseTable(html, startIndex) {
    try {
      const tableEndIndex = html.indexOf('</table>', startIndex);
      if (tableEndIndex === -1) return null;
      
      const tableHtml = html.substring(startIndex, tableEndIndex + 8);
      const rows = [];
      
      const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
      let rowMatch;
      
      while ((rowMatch = rowRegex.exec(tableHtml)) !== null) {
        const cells = [];
        const cellRegex = /<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi;
        let cellMatch;
        
        while ((cellMatch = cellRegex.exec(rowMatch[1])) !== null) {
          cells.push(this.stripHtmlTags(cellMatch[1]));
        }
        
        if (cells.length > 0) {
          rows.push(cells);
        }
      }
      
      if (rows.length === 0) return null;
      
      const tableRows = rows.map((row, rowIndex) => {
        return new TableRow({
          children: row.map(cellText => {
            return new TableCell({
              children: [new Paragraph({
                children: [new TextRun({
                  text: cellText,
                  bold: rowIndex === 0
                })]
              })],
              shading: rowIndex === 0 ? { fill: 'E0E0E0' } : undefined
            });
          })
        });
      });
      
      return new Table({
        rows: tableRows,
        width: { size: 100, type: WidthType.PERCENTAGE }
      });
    } catch (error) {
      logger.error('解析表格失败:', error);
      return null;
    }
  }

  async generateInspectionReport(taskResult, template) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `inspection-report-${timestamp}.docx`;

    if (template && template.htmlContent) {
      const data = {
        taskName: taskResult.taskName,
        startTime: taskResult.startTime,
        endTime: taskResult.endTime,
        duration: taskResult.duration,
        status: taskResult.status,
        ...taskResult.data
      };
      
      logger.info(`生成报告数据: ${JSON.stringify(data, null, 2)}`);
      logger.info(`模板内容: ${template.htmlContent}`);
      
      const processedResult = this.replacePlaceholders(template.htmlContent, data);
      logger.info(`处理后内容: ${processedResult.substring(0, 500)}...`);
      
      return await this.generateFromHtml(template.htmlContent, data, filename);
    } else {
      return await this.generateDefaultReport(taskResult, filename);
    }
  }

  async generateDefaultReport(taskResult, filename) {
    const doc = new Document({
      sections: [{
        properties: {},
        children: [
          new Paragraph({
            text: 'API巡检报告',
            heading: HeadingLevel.TITLE,
            alignment: AlignmentType.CENTER
          }),
          new Paragraph({
            text: taskResult.taskName || '巡检任务',
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 }
          }),
          new Paragraph({
            text: `生成时间: ${new Date().toLocaleString('zh-CN')}`,
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 }
          }),
          new Paragraph({
            text: '执行概况',
            heading: HeadingLevel.HEADING_2
          }),
          new Paragraph({ children: [new TextRun(`任务名称: ${taskResult.taskName}`)] }),
          new Paragraph({ children: [new TextRun(`执行时间: ${taskResult.startTime}`)] }),
          new Paragraph({ children: [new TextRun(`完成时间: ${taskResult.endTime}`)] }),
          new Paragraph({ children: [new TextRun(`总耗时: ${taskResult.duration}ms`)] }),
          new Paragraph({ children: [new TextRun(`执行状态: ${taskResult.status}`)] }),
          new Paragraph({ text: '' }),
          new Paragraph({
            text: 'API执行详情',
            heading: HeadingLevel.HEADING_2
          }),
          this.createApiResultsTable(taskResult.results || [])
        ]
      }]
    });

    const fullPath = path.join(this.outputDir, filename);
    const buffer = await Packer.toBuffer(doc);
    fs.writeFileSync(fullPath, buffer);
    logger.info(`默认报告生成成功: ${fullPath}`);
    return { success: true, path: fullPath };
  }

  createApiResultsTable(results) {
    if (results.length === 0) {
      return new Paragraph({ children: [new TextRun('无执行记录')] });
    }

    const rows = [
      new TableRow({
        children: ['API名称', '方法', '状态', '耗时', '结果'].map(header => 
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: header, bold: true })] })],
            shading: { fill: 'E0E0E0' }
          })
        )
      }),
      ...results.map(result => 
        new TableRow({
          children: [
            result.name || '',
            result.method || '',
            result.success ? '成功' : '失败',
            `${result.duration}ms`,
            result.success ? '正常' : (result.error || '未知错误')
          ].map(text => 
            new TableCell({
              children: [new Paragraph({ children: [new TextRun(text)] })]
            })
          )
        })
      )
    ];

    return new Table({
      rows,
      width: { size: 100, type: WidthType.PERCENTAGE }
    });
  }
}

module.exports = new HtmlToWordService();

