import { IsInt, Max, Min, ValidateIf } from 'class-validator';

/** null clears the restriction entirely (no offer cap). */
export class SetOfferLimitDto {
  @ValidateIf((o) => o.maxOffersAllowed !== null)
  @IsInt()
  @Min(1)
  @Max(10)
  maxOffersAllowed!: number | null;
}
