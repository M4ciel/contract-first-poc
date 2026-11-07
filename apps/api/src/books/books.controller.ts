import { Controller, Get, Param, Query } from '@nestjs/common';
import type { Book, BookPage, BookV2Page } from '@acme/api-types';
import {
  GetBookParams,
  ListBooksQueryParams,
  ListBooksV2QueryParams,
} from '@acme/api-types/validators';
import type { z } from 'zod';
import { paginate } from '@common/pagination.js';
import { RequireFeature } from '@common/feature-flag.guard.js';
import { problems } from '@problems/problem.exception.js';
import { ZodValidationPipe } from '@problems/zod-validation.pipe.js';
import { toBookV1, toBookV2 } from './book.js';
import { BookRepository } from './book.repository.js';

@Controller()
export class BooksController {
  constructor(private readonly books: BookRepository) {}

  @Get('v1/books')
  async listBooks(
    @Query(new ZodValidationPipe(ListBooksQueryParams, 'query'))
    query: z.output<typeof ListBooksQueryParams>,
  ): Promise<BookPage> {
    const page = paginate(await this.books.findAll(), query);
    return { items: page.items.map(toBookV1), nextCursor: page.nextCursor };
  }

  @Get('v1/books/:bookId')
  async getBook(
    @Param(new ZodValidationPipe(GetBookParams, 'path')) params: z.output<typeof GetBookParams>,
  ): Promise<Book> {
    const book = await this.books.findById(params.bookId);
    if (!book) throw problems.bookNotFound(params.bookId);
    return toBookV1(book);
  }

  /** Alpha: hidden behind the `booksV2` flag, answering 404 as if the route did not exist. */
  @Get('v2/books')
  @RequireFeature('booksV2')
  async listBooksV2(
    @Query(new ZodValidationPipe(ListBooksV2QueryParams, 'query'))
    query: z.output<typeof ListBooksV2QueryParams>,
  ): Promise<BookV2Page> {
    const page = paginate(await this.books.findAll(), query);
    return { items: page.items.map(toBookV2), nextCursor: page.nextCursor };
  }
}
