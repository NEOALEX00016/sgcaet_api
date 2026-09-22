import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Header,
  Param,
  Patch,
  Post,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { EvidenciasService } from './evidencias.service';
import { CreateEvidenciaDto } from './dto/create-evidencia.dto';
import { UpdateEvidenciaDto } from './dto/update-evidencia.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import type { Response } from 'express';

type UploadedFile = {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
};

@Controller('evidencias')
@RequirePermission('evidencias.gestionar')
export class EvidenciasController {
  constructor(private readonly evidenciasService: EvidenciasService) {}

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } }),
  )
  create(
    @Body() body: CreateEvidenciaDto,
    @UploadedFile() file: UploadedFile,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    if (!file) {
      throw new BadRequestException(
        'Debe adjuntar un archivo en el campo file',
      );
    }

    return this.evidenciasService.createFromUpload(body, file, user);
  }

  @Get()
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.evidenciasService.findAll(user.empresaId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.evidenciasService.findOne(id, user.empresaId);
  }

  @Get(':id/archivo')
  @Header('Cache-Control', 'private, max-age=300')
  async readFile(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Res() response: Response,
  ) {
    const file = await this.evidenciasService.readFile(id, user.empresaId);
    response.setHeader('Content-Type', file.mimeType);
    response.setHeader(
      'Content-Disposition',
      `inline; filename="${file.evidencia.nombreArchivo}"`,
    );
    response.send(file.content);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateEvidenciaDto: UpdateEvidenciaDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.evidenciasService.update(id, updateEvidenciaDto, user);
  }

  @Delete(':id')
  async remove(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.evidenciasService.remove(id, user);
    return { ok: true };
  }
}
