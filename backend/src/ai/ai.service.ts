import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import axios from 'axios';
import * as fs from 'fs/promises';
import * as path from 'path';
import { AnalyzePhotoResponseDto } from './dto/ai-response.dto';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly uploadDir = 'uploads';

  constructor(private prisma: PrismaService) {}

  private getAiConfig() {
    const baseUrl = process.env.AI_API_BASE_URL;
    const apiKey = process.env.AI_API_KEY;
    const model = process.env.AI_MODEL_NAME || 'gpt-4o';

    if (!baseUrl || !apiKey) {
      throw new BadRequestException('AI configuration missing (AI_API_BASE_URL, AI_API_KEY)');
    }

    return { baseUrl, apiKey, model };
  }

  async analyzePhoto(id: number): Promise<AnalyzePhotoResponseDto> {
    const photo = await this.prisma.photo.findUnique({ where: { id } });
    if (!photo) {
      throw new BadRequestException('Photo not found');
    }

    // Use the actual file path from the database URL
    // photo.url is typically like "/uploads/..." or "/uploads/compressed/..."
    const relativePath = photo.url.startsWith('/') ? photo.url.slice(1) : photo.url;
    
    // Ensure we don't traverse out of the app directory for security
    if (relativePath.includes('..')) {
       throw new BadRequestException('Invalid photo path');
    }

    const filePath = path.resolve(process.cwd(), relativePath);

    try {
      await fs.access(filePath);
    } catch {
      // Fallback: if compressed version doesn't exist, try original if the URL was compressed
      // Or if the URL was original, try compressed?
      // For now, let's just report error, or maybe try to find the file in uploads/original if it was compressed
      this.logger.warn(`File not found at ${filePath}`);
      throw new BadRequestException('Photo file not found on server');
    }

    const base64Image = await fs.readFile(filePath, { encoding: 'base64' });
    return this.analyzeImageBuffer(base64Image);
  }

  async analyzeImageUpload(file: Express.Multer.File): Promise<AnalyzePhotoResponseDto> {
    const base64Image = file.buffer.toString('base64');
    return this.analyzeImageBuffer(base64Image);
  }

  private async analyzeImageBuffer(base64Image: string): Promise<AnalyzePhotoResponseDto> {
    const config = this.getAiConfig();

    const prompt = `
    Please analyze this image, focusing on any visible watermark text (often in corners) or EXIF-like data overlaid on the image.
    Extract the following information if available:
    1. Camera Model (e.g., "Xiaomi 17 Ultra", "Leica", "Sony A7M4")
    2. Lens Model (e.g., "75mm f/1.8", "24-70mm GM")
    3. Shooting Parameters (ISO, Aperture, Shutter Speed)
    4. Shooting Time (Date/Time)
    5. Location (if visible text)

    For the "story" field, please follow these strict guidelines:
    角色设定： 你是一位极具洞察力和感性思维的“视觉叙事者”。你擅长通过照片的构图、色彩和光影，捕捉那些隐藏在像素背后的生活哲学与情感流动。
    任务要求： 每次当我上传一张照片时，请不要进行冗长的画面描述，而是直接提炼出照片背后传递的情绪或生命意义。
    输出规范：
    1. 字数限制： 始终保持在 30字左右（一句话总结）。
    2. 核心内容： 聚焦于画面带给人的情感共鸣、氛围感或那个瞬间被定格的深层原因。
    3. 语言风格： 优美且富有洞察力，避免平铺直叙。
    4. 语言要求： 始终使用中文输出。
    
    If specific text is not visible, infer the scene description and suggest a camera model if distinctive features appear (but prefer "Unknown" if unsure).
    
    Return ONLY a JSON object with these keys:
    {
      "camera": "string or null",
      "lens": "string or null",
      "iso": "string or null",
      "aperture": "string or null",
      "shutter": "string or null",
      "takenAt": "ISO date string or null",
      "description": "string (brief scene description)",
      "story": "string (max 30 words, Chinese)",
      "location": "string or null"
    }
    Do not include markdown formatting like \`\`\`json. Just the raw JSON.
    `;

    try {
      const response = await axios.post(
        `${config.baseUrl}/chat/completions`,
        {
          model: config.model,
          messages: [
            {
              role: 'user',
              content: [
                { type: 'text', text: prompt },
                {
                  type: 'image_url',
                  image_url: {
                    url: `data:image/jpeg;base64,${base64Image}`,
                  },
                },
              ],
            },
          ],
          max_tokens: 500,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${config.apiKey}`,
          },
        },
      );

      const content = response.data.choices[0].message.content;
      try {
        // Handle potential markdown code block wrapping
        const cleanContent = content.replace(/```json\n?|\n?```/g, '').trim();
        return JSON.parse(cleanContent);
      } catch (e) {
        this.logger.error('Failed to parse AI response JSON', content);
        throw new BadRequestException('Invalid AI response format');
      }
    } catch (error) {
      this.logger.error('AI API call failed', error.response?.data || error.message);
      throw new BadRequestException(`AI Service Error: ${error.response?.data?.error?.message || error.message}`);
    }
  }
}
