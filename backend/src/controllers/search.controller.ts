import { Controller, Get, Query, HttpException, HttpStatus } from '@nestjs/common';
import { ElasticsearchService } from '../services/elasticsearch.service';
import { SearchRawTextDto, SearchResultDto } from '../dto/search.dto';

@Controller('search')
export class SearchController {
  constructor(private readonly elasticsearchService: ElasticsearchService) {}

  @Get('rawtexts')
  async searchRawTexts(@Query() searchDto: SearchRawTextDto): Promise<SearchResultDto> {
    try {
      return await this.elasticsearchService.searchRawText(searchDto);
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Search failed',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('suggest')
  async suggestNames(
    @Query('q') query: string,
    @Query('project_id') projectId?: string
  ): Promise<{ suggestions: string[] }> {
    try {
      if (!query) {
        throw new HttpException(
          {
            success: false,
            message: 'Query parameter "q" is required',
          },
          HttpStatus.BAD_REQUEST
        );
      }

      const suggestions = await this.elasticsearchService.suggestRawTextNames(query, projectId);
      return { suggestions };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        {
          success: false,
          message: 'Suggestions failed',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}

