import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import * as ejs from 'ejs';
import * as path from 'path';
import * as fs from 'fs';

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: parseInt(process.env.EMAIL_PORT || '587'),
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });
  }

  private renderTemplate(templateName: string, data: any): string {
    const templatePath = path.join(__dirname, `templates/${templateName}.ejs`);
    const template = fs.readFileSync(templatePath, 'utf-8');
    return ejs.render(template, data);
  }

  async sendRegistrationEmail(email: string, name: string, username: string, password: string): Promise<void> {
    const html = this.renderTemplate('registrationConfirmation', {
      name,
      username,
      password,
    });

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Welcome to FSQ360 - Your Account is Ready!',
      html,
    };

    await this.transporter.sendMail(mailOptions);
    console.log(`Registration email sent to ${email}`);
  }

  async sendTrainerRegistrationEmail(email: string, name: string, username: string, password: string): Promise<void> {
    return this.sendRegistrationEmail(email, name, username, password);
  }

  async sendNotificationEmail(email: string, userName: string, message: string, actionUrl?: string): Promise<void> {
    const html = this.renderTemplate('notificationEmail', {
      userName,
      message,
      actionUrl,
    });

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'FSQ360 Notification',
      html,
    };

    await this.transporter.sendMail(mailOptions);
    console.log(`Notification email sent to ${email}`);
  }

  async sendMRMEmail(email: string, meetingDate: string, meetingTime: string, location: string, agenda: string): Promise<void> {
    const html = this.renderTemplate('mrmEmailTemplate', {
      meetingDate,
      meetingTime,
      location,
      agenda,
    });

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Management Review Meeting - FSQ360',
      html,
    };

    await this.transporter.sendMail(mailOptions);
    console.log(`MRM email sent to ${email}`);
  }

  async sendEmail(to: string, subject: string, text: string): Promise<void> {
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to,
      subject,
      text
    };

    await this.transporter.sendMail(mailOptions);
    console.log(`Email sent to ${to}`);
  }
}
