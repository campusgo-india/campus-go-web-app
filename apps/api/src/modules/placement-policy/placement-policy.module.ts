import { Global, Module } from '@nestjs/common';
import { PlacementPolicyController, MePlacementPolicyController } from './placement-policy.controller';
import { PlacementPolicyService } from './placement-policy.service';

// Global, matching NotificationsModule: JobsService (a different module)
// needs PlacementPolicyService to read the offer-limit rule at apply time.
@Global()
@Module({
  controllers: [PlacementPolicyController, MePlacementPolicyController],
  providers: [PlacementPolicyService],
  exports: [PlacementPolicyService],
})
export class PlacementPolicyModule {}
