import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Header,
  Param,
  Post,
  Query,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { CreateDocumentDto } from './dto/create-document.dto';
import { DocumentQueryDto } from './dto/document-query.dto';
import { DocumentsService } from './documents.service';

type UploadedFile = {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
};

@ApiTags('documents')
@ApiBearerAuth('access-token')
@Controller('documents')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Post()
  @RequirePermission('documents.create')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Subir documento' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        entidadRelacionada: { type: 'string' },
        entidadRelacionadaId: { type: 'string', format: 'uuid' },
      },
      required: ['file'],
    },
  })
  create(
    @Body() dto: CreateDocumentDto,
    @UploadedFile() file: UploadedFile,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    if (!file) throw new BadRequestException('Archivo no enviado');
    return this.documentsService.create(dto, file, user);
  }

  @Get()
  @RequirePermission('documents.read')
  @ApiOperation({ summary: 'Listar documentos' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'mimeType', required: false })
  @ApiQuery({ name: 'createdBy', required: false })
  @ApiQuery({ name: 'dateFrom', required: false })
  @ApiQuery({ name: 'dateTo', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'entidadRelacionada', required: false })
  @ApiQuery({ name: 'entidadRelacionadaId', required: false })
  findAll(
    @Query() query: DocumentQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.documentsService.findAll(query, user);
  }

  @Get(':id')
  @RequirePermission('documents.read')
  @ApiOperation({ summary: 'Obtener metadata de documento' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.documentsService.findOne(id, user);
  }

  @Get(':id/view')
  @RequirePermission('documents.read')
  @Header('Cache-Control', 'private, max-age=300')
  @ApiOperation({ summary: 'Visualizar documento en navegador' })
  async view(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Res() response: Response,
  ) {
    const { item, content } = await this.documentsService.view(id, user);
    response.setHeader('Content-Type', item.mimeType);
    response.setHeader(
      'Content-Disposition',
      `inline; filename="${item.originalName}"`,
    );
    response.send(content);
  }

  @Get(':id/download')
  @RequirePermission('documents.download')
  @Header('Cache-Control', 'private, max-age=0')
  @ApiOperation({ summary: 'Descargar documento' })
  async download(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Res() response: Response,
  ) {
    const { item, content } = await this.documentsService.download(id, user);
    response.setHeader('Content-Type', item.mimeType);
    response.setHeader(
      'Content-Disposition',
      `attachment; filename="${item.originalName}"`,
    );
    response.send(content);
  }

  @Delete(':id')
  @RequirePermission('documents.delete')
  @ApiOperation({ summary: 'Eliminar documento' })
  remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.documentsService.remove(id, user);
  }
}
