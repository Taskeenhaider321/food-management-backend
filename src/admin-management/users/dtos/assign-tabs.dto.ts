// TEST/account-creation/users/dtos/assign-tabs.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsArray } from 'class-validator';

class TabDto {
  @ApiProperty({ description: 'Tab name', example: 'User Management' })
  Tab: string;

  @ApiProperty({ description: 'Creation permission', example: true })
  Creation: boolean;

  @ApiProperty({ description: 'Approval permission', example: false })
  Approval: boolean;

  @ApiProperty({ description: 'Review permission', example: true })
  Review: boolean;

  @ApiProperty({ description: 'Edit permission', example: true })
  Edit: boolean;

  @ApiProperty({ description: 'Authority permission', example: false })
  Authority: boolean;
}

export class AssignTabsDto {
  @ApiProperty({ description: 'Array of tabs to assign', type: [TabDto] })
  @IsArray()
  Tabs: TabDto[];
}
