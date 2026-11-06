import { Body, Controller, Get, HttpCode, Param, Post, Res } from '@nestjs/common';
import type { Loan } from '@acme/api-types';
import { CreateLoanBody, GetLoanParams } from '@acme/api-types/validators';
import type { FastifyReply } from 'fastify';
import type { z } from 'zod';
import { Clock } from '#src/common/clock.js';
import { ZodValidationPipe } from '#src/problems/zod-validation.pipe.js';
import { toLoan } from './loan.js';
import { LoansService } from './loans.service.js';

@Controller('v1/loans')
export class LoansController {
  constructor(
    private readonly loans: LoansService,
    private readonly clock: Clock,
  ) {}

  @Post()
  @HttpCode(201)
  async createLoan(
    @Body(new ZodValidationPipe(CreateLoanBody, 'body')) body: z.output<typeof CreateLoanBody>,
    @Res({ passthrough: true }) reply: FastifyReply,
  ): Promise<Loan> {
    const loan = await this.loans.create(body.bookId);
    void reply.header('location', `/v1/loans/${loan.id}`);
    return toLoan(loan, this.clock.now());
  }

  @Get(':loanId')
  async getLoan(
    @Param(new ZodValidationPipe(GetLoanParams, 'path')) params: z.output<typeof GetLoanParams>,
  ): Promise<Loan> {
    return toLoan(await this.loans.get(params.loanId), this.clock.now());
  }
}
