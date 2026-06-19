import { Controller, Post, Get, Delete, Body, Param } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { CreateNotificationDto } from './dtos/create-notification.dto';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

@ApiTags('Notification')
@Controller('notification')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Post()
  @ApiBearerAuth()
  async createNotification(@Body() createDto: CreateNotificationDto) {
    return this.notificationService.createNotification(createDto);
  }

  @Get('all/:departmentId')
  @ApiBearerAuth()
  async getAllNotifications(@Param('departmentId') departmentId: string) {
    return this.notificationService.getAllNotifications(departmentId);
  }

  @Get(':id')
  @ApiBearerAuth()
  async getNotification(@Body('id') id: string) {
    return this.notificationService.getNotification(id);
  }

  @Delete()
  @ApiBearerAuth()
  async deleteNotification(@Body('id') id: string) {
    return this.notificationService.deleteNotification(id);
  }

  @Delete('all')
  @ApiBearerAuth()
  async deleteAllNotifications(): Promise<{
    status: boolean;
    message: string;
    data: any;
  }> {
    return this.notificationService.deleteAllNotifications();
  }
}
