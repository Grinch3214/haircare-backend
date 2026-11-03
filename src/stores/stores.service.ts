import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { asc, eq } from 'drizzle-orm';
import { DRIZZLE, type Database } from '../database/database.constants';
import { type Store, stores } from '../database/schema';
import type { CreateStoreDto } from './dto/create-store.dto';
import type { UpdateStoreDto } from './dto/update-store.dto';

@Injectable()
export class StoresService {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  findAll(): Promise<Store[]> {
    return this.db.select().from(stores).orderBy(asc(stores.title));
  }

  findBySlug(slug: string): Promise<Store | undefined> {
    return this.db.query.stores.findFirst({ where: { slug } });
  }

  async create(dto: CreateStoreDto): Promise<Store> {
    if (await this.findBySlug(dto.slug)) {
      throw new ConflictException('Store slug already taken');
    }

    const [store] = await this.db.insert(stores).values(dto).returning();
    return store;
  }

  async update(id: string, dto: UpdateStoreDto): Promise<Store> {
    // У экземпляра DTO не присланные поля есть, но равны undefined — Drizzle их пропускает
    if (Object.values(dto).every((value) => value === undefined)) {
      throw new BadRequestException('Nothing to update');
    }

    const [store] = await this.db
      .update(stores)
      .set(dto)
      .where(eq(stores.id, id))
      .returning();
    if (!store) {
      throw new NotFoundException('Store not found');
    }
    return store;
  }
}
