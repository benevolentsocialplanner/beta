// src/transaction/transaction.service.ts
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Transaction } from './schema/transaction.schema';
import * as csv from 'csv-parser';
import * as stream from 'stream';
import * as dayjs from 'dayjs';

@Injectable()
export class TransactionService {
  private normalizationRules = [
    { patterns: [/AMZN/i, /AMAZON/i], merchant: 'Amazon', category: 'Shopping', flags: ['online_purchase'] },
    { patterns: [/NFLX/i, /NETFLIX/i], merchant: 'Netflix', category: 'Entertainment', flags: ['subscription'] },
  ];

  constructor(@InjectModel(Transaction.name) private transactionModel: Model<Transaction>) {}

  /**
   * Upload transactions from a CSV file.
   */
  async uploadTransactions(buffer: Buffer): Promise<Transaction[]> {
    return new Promise((resolve, reject) => {
      const results: Transaction[] = [];
      const readableStream = new stream.Readable();
      readableStream.push(buffer);
      readableStream.push(null);

      readableStream
        .pipe(csv())
        .on('data', (data) => {
          results.push({
            description: data.description as string,
            amount: parseFloat(data.amount),
            date: data.date as Date,
          });
        })
        .on('end', async () => {
          await this.transactionModel.insertMany(results);
          resolve(results);
        })
        .on('error', (error) => reject(error));
    });
  }

  /**
   * Normalize a merchant based on rules.
   */
  normalizeMerchant(description: string) {
    const rule = this.normalizationRules.find(r => r.patterns.some(p => p.test(description)));
    return rule ? { merchant: rule.merchant, category: rule.category, flags: rule.flags } : null;
  }

  /**
   * Detect subscription & recurring patterns.
   */
  async detectPatterns() {
    const transactions = await this.transactionModel.find().exec();
    return transactions.map(tx => {
      const normalized = this.normalizeMerchant(tx.description);
      if (!normalized) return null;

      return {
        type: normalized.flags.includes('subscription') ? 'subscription' : 'recurring',
        merchant: normalized.merchant,
        amount: Math.abs(tx.amount),
        next_expected: dayjs(tx.date).add(1, 'month').format('YYYY-MM-DD'),
      };
    }).filter(Boolean);
  }

  async getAllTransactions(): Promise<unknown> {
    try {
      console.log('listin')
      return await this.transactionModel.find().sort({ date: -1 }).exec();
    } catch (error) {
      throw new Error('Failed to fetch transactions.');
    }
  }

}
