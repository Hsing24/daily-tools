import { Component } from '@angular/core';

@Component({
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly toolGroups = [
    {
      name: '格式化與轉換',
      tools: [
        'JSON Formatter',
        'HTML Preview',
        'Base64 Encoder / Decoder'
      ]
    },
    {
      name: '網路與 API',
      tools: [
        'URL Encoder / Decoder',
        'HTTP Header Viewer',
        'JWT Decoder'
      ]
    },
    {
      name: '前端樣式與除錯',
      tools: [
        'Color Converter',
        'CSS Unit Helper',
        'Regex Tester'
      ]
    }
  ];
}
