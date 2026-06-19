import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
// Admin-Management (was account-creation)
import { CompanyModule } from './admin-management/company/company.module';
import { DepartmentModule } from './admin-management/department/department.module';
import { UserModule } from './admin-management/users/user.module';
import { ProfileModule } from './admin-management/profile/profile.module';
// Maintenance-Program (was tech)
import { EquipmentModule } from './maintenance-program/equipment/equipment.module';
import { CalibrationRecordModule } from './maintenance-program/calibration-record/calibration-record.module';
import { MachineryModule } from './maintenance-program/machinery/machinery.module';
import { PreventiveMaintenanceModule } from './maintenance-program/preventive-maintenance/preventive-maintenance.module';
import { WorkRequestModule } from './maintenance-program/work-request/work-request.module';
// Document-Management (was admin)
import { UploadDocumentsModule } from './document-management/upload-documents/upload-documents.module';
import { ChangeRequestModule } from './document-management/change-request/change-request.module';
import { DocumentModule } from './document-management/document/document.module';
import { FormRecordsModule } from './document-management/form-records/form-records.module';
import { ListOfFormsModule } from './document-management/list-of-forms/list-of-forms.module';
// Competency-Management (was hr — employee, training, trainer, etc.)
import { EmployeeModule } from './competency-management/employee/employee.module';
import { TrainingModule } from './competency-management/training/training.module';
import { PersonalRequisitionModule } from './competency-management/personal-requisition/personal-requisition.module';
import { YearlyTrainingPlanModule } from './competency-management/yearly-training-plan/yearly-training-plan.module';
import { MonthlyTrainingPlanModule } from './competency-management/monthly-training-plan/monthly-training-plan.module';
import { TrainerModule } from './competency-management/trainer/trainer.module';
// Supplier-Management (was hr/supplier)
import { SupplierModule } from './supplier-management/supplier/supplier.module';
// Internal-Audit (merged auditor + internal-audit)
import { ConductAuditsModule } from './internal-audit/conduct-audits/conduct-audits.module';
import { CorrectiveActionModule } from './internal-audit/corrective-action/corrective-action.module';
import { CreateChecklistModule } from './internal-audit/create-checklist/create-checklist.module';
import { ReportsModule } from './internal-audit/reports/reports.module';
import { InternalAuditorModule } from './internal-audit/internal-auditor/internal-auditor.module';
import { MonthlyAuditingPlanModule } from './internal-audit/monthly-auditing-plan/monthly-auditing-plan.module';
import { ProcessOwnerModule } from './internal-audit/process-owner/process-owner.module';
import { YearlyAuditingPlanModule } from './internal-audit/yearly-auditing-plan/yearly-auditing-plan.module';
// Review-Meetings (was management-rev)
import { MRMModule } from './review-meetings/mrm/mrm.module';
import { NotificationModule } from './review-meetings/notification/notification.module';
import { MeetingParticipantsModule } from './review-meetings/meeting-participants/meeting-participants.module';
// Task Management (review team, review plan, minutes of meeting)
import { ReviewTeamModule } from './review-meetings/review-team/review-team.module';
import { ReviewPlanModule } from './review-meetings/review-plan/review-plan.module';
import { MeetingMinutesModule } from './review-meetings/meeting-minutes/meeting-minutes.module';
// Food-Safety (was haccp)
import { ConductHaccpModule } from './food-safety/conduct-haccp/conduct-haccp.module';
import { DecisionTreeModule } from './food-safety/decision-tree/decision-tree.module';
import { FoodSafetyPlanModule } from './food-safety/food-safety-plan/food-safety-plan.module';
import { HaccpTeamModule } from './food-safety/haccp-team/haccp-team.module';
import { ProcessesModule } from './food-safety/processes/processes.module';
import { ProductModule } from './food-safety/product/product.module';
// Cloudinary
import { CloudinaryModule } from './cloudinary/cloudinary.module';
// Email
import { EmailModule } from './email/email.module';
// Auth & RBAC
import { AuthModule } from './auth/auth.module';
import { RbacModule } from './rbac/rbac.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRootAsync({
      useFactory: async () => ({
        uri: process.env.MONGODB_URI,
        connectionFactory: (connection) => {
          console.log('✅ MongoDB connected successfully');
          return connection;
        },
      }),
    }),
    // Admin-Management
    CompanyModule,
    DepartmentModule,
    UserModule,
    ProfileModule,
    // Maintenance-Program
    EquipmentModule,
    CalibrationRecordModule,
    MachineryModule,
    PreventiveMaintenanceModule,
    WorkRequestModule,
    // Document-Management
    UploadDocumentsModule,
    ChangeRequestModule,
    DocumentModule,
    FormRecordsModule,
    ListOfFormsModule,
    // Competency-Management
    EmployeeModule,
    TrainingModule,
    PersonalRequisitionModule,
    YearlyTrainingPlanModule,
    MonthlyTrainingPlanModule,
    TrainerModule,
    // Supplier-Management
    SupplierModule,
    // Internal-Audit
    ConductAuditsModule,
    CreateChecklistModule,
    ReportsModule,
    CorrectiveActionModule,
    InternalAuditorModule,
    MonthlyAuditingPlanModule,
    ProcessOwnerModule,
    YearlyAuditingPlanModule,
    // Review-Meetings
    MRMModule,
    NotificationModule,
    MeetingParticipantsModule,
    // Task Management (review team, review plan, minutes of meeting)
    ReviewTeamModule,
    ReviewPlanModule,
    MeetingMinutesModule,
    // Food-Safety
    ConductHaccpModule,
    DecisionTreeModule,
    FoodSafetyPlanModule,
    HaccpTeamModule,
    ProcessesModule,
    ProductModule,
    // Cloudinary
    CloudinaryModule,
    // Email
    EmailModule,
    // Auth & RBAC
    AuthModule,
    RbacModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
})
export class AppModule {}
