import { IsEmail, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { NormalizeEmail } from '../../common/decorators/transforms';

export class LoginDto {
  @NormalizeEmail()
  @IsEmail()
  email!: string;

  // Без MinLength: правила пароля могут меняться, а старые пароли должны продолжать работать
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  password!: string;
}
