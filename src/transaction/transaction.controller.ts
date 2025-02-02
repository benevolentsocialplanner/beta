import { Controller, Post, UploadedFile, UseInterceptors, Body, Get } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { TransactionService } from './transaction.service';
import Multer from 'multer';

@Controller('api/transaction')
export class TransactionController {
  constructor(private readonly transactionService: TransactionService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadCsv(@UploadedFile() file: Multer.File) {
    console.log('Uploading CSV...');
    return this.transactionService.uploadTransactions(file.buffer);
  }

  @Post('analyze/merchant')
  normalizeTransaction(@Body() body: { transaction: { description: string } }) {
    return { normalized: this.transactionService.normalizeMerchant(body.transaction.description) };
  }

  @Get('analyze/patterns')
  async detectPatterns() {
    return { patterns: await this.transactionService.detectPatterns() };
  }

  /**
   * Get all transactions
   */
  @Get('list')
  async getTransactions() {
    return this.transactionService.getAllTransactions();
  }
}
