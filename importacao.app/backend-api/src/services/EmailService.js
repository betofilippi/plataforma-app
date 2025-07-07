const nodemailer = require('nodemailer');
const fs = require('fs').promises;
const path = require('path');

/**
 * Serviço de envio de emails
 */
class EmailService {
  constructor() {
    this.transporter = null;
    this.templates = new Map();
    this.initialized = false;
  }

  /**
   * Inicializar serviço de email
   */
  async initialize() {
    if (this.initialized) return;

    try {
      // Configurar transporter
      this.transporter = nodemailer.createTransporter({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        },
        tls: {
          rejectUnauthorized: false
        }
      });

      // Verificar conexão
      await this.transporter.verify();
      
      // Carregar templates
      await this.loadTemplates();

      this.initialized = true;
      console.log('✅ Serviço de email inicializado');

    } catch (error) {
      console.error('❌ Erro ao inicializar serviço de email:', error);
      throw error;
    }
  }

  /**
   * Carregar templates de email
   */
  async loadTemplates() {
    try {
      const templatesDir = path.join(__dirname, '../templates/email');
      
      // Criar diretório se não existir
      try {
        await fs.access(templatesDir);
      } catch {
        await fs.mkdir(templatesDir, { recursive: true });
      }

      // Template padrão de notificação
      const defaultTemplate = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{notification_title}}</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            margin: 0;
            padding: 0;
            background-color: #f4f4f4;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .header {
            background-color: #007bff;
            color: white;
            padding: 20px;
            border-radius: 8px 8px 0 0;
            text-align: center;
        }
        .content {
            padding: 20px;
        }
        .notification-message {
            background-color: #f8f9fa;
            padding: 15px;
            border-left: 4px solid #007bff;
            margin: 15px 0;
        }
        .action-button {
            display: inline-block;
            padding: 12px 24px;
            background-color: #007bff;
            color: white;
            text-decoration: none;
            border-radius: 4px;
            margin: 15px 0;
        }
        .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #eee;
            font-size: 12px;
            color: #666;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>{{notification_title}}</h1>
        </div>
        <div class="content">
            <p>Olá {{user_name}},</p>
            
            <div class="notification-message">
                {{notification_message}}
            </div>
            
            {{#action_url}}
            <a href="{{action_url}}" class="action-button">{{action_label}}</a>
            {{/action_url}}
            
            <p>Esta é uma notificação automática do sistema ERP NXT.</p>
        </div>
        <div class="footer">
            <p>© 2024 NXT Indústria e Comércio Ltda. Todos os direitos reservados.</p>
            <p><a href="{{unsubscribe_url}}">Cancelar inscrição</a></p>
        </div>
    </div>
</body>
</html>
      `;

      this.templates.set('default', defaultTemplate);

      // Template para alerta de estoque
      const stockAlertTemplate = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Alerta de Estoque</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            margin: 0;
            padding: 0;
            background-color: #f4f4f4;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .header {
            background-color: #ffc107;
            color: #212529;
            padding: 20px;
            border-radius: 8px 8px 0 0;
            text-align: center;
        }
        .alert-box {
            background-color: #fff3cd;
            border: 1px solid #ffeaa7;
            border-radius: 4px;
            padding: 15px;
            margin: 15px 0;
        }
        .product-info {
            background-color: #f8f9fa;
            padding: 15px;
            border-radius: 4px;
            margin: 10px 0;
        }
        .urgent {
            background-color: #f8d7da;
            border-color: #f5c6cb;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>⚠️ Alerta de Estoque</h1>
        </div>
        <div class="content">
            <p>Olá {{user_name}},</p>
            
            <div class="alert-box {{#urgent}}urgent{{/urgent}}">
                <strong>{{notification_title}}</strong>
                <p>{{notification_message}}</p>
            </div>
            
            {{#product_info}}
            <div class="product-info">
                <h3>Informações do Produto</h3>
                <p><strong>Produto:</strong> {{product_name}}</p>
                <p><strong>Código:</strong> {{product_code}}</p>
                <p><strong>Estoque atual:</strong> {{current_stock}}</p>
                <p><strong>Estoque mínimo:</strong> {{min_stock}}</p>
            </div>
            {{/product_info}}
            
            {{#action_url}}
            <a href="{{action_url}}" class="action-button">Ver Detalhes</a>
            {{/action_url}}
        </div>
        <div class="footer">
            <p>© 2024 NXT Indústria e Comércio Ltda. Todos os direitos reservados.</p>
        </div>
    </div>
</body>
</html>
      `;

      this.templates.set('stock_alert', stockAlertTemplate);

      console.log('✅ Templates de email carregados');

    } catch (error) {
      console.error('❌ Erro ao carregar templates:', error);
    }
  }

  /**
   * Enviar notificação por email
   */
  async sendNotification(to, subject, template, data = {}) {
    try {
      if (!this.initialized) {
        await this.initialize();
      }

      // Renderizar template
      const html = this.renderTemplate(template, data);
      
      // Configurar email
      const mailOptions = {
        from: `"ERP NXT" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
        to,
        subject,
        html,
        text: this.htmlToText(html)
      };

      // Enviar email
      const result = await this.transporter.sendMail(mailOptions);
      
      console.log(`📧 Email enviado para ${to}: ${result.messageId}`);
      
      return {
        success: true,
        messageId: result.messageId,
        accepted: result.accepted,
        rejected: result.rejected
      };

    } catch (error) {
      console.error('❌ Erro ao enviar email:', error);
      throw error;
    }
  }

  /**
   * Renderizar template
   */
  renderTemplate(templateName, data) {
    let template = this.templates.get(templateName) || this.templates.get('default');
    
    // Substituir variáveis no template
    Object.keys(data).forEach(key => {
      const value = data[key];
      const regex = new RegExp(`{{${key}}}`, 'g');
      template = template.replace(regex, value || '');
    });

    // Processar condicionais simples
    template = this.processConditionals(template, data);

    return template;
  }

  /**
   * Processar condicionais no template
   */
  processConditionals(template, data) {
    // Processar {{#variable}} ... {{/variable}}
    const conditionalRegex = /{{#(\w+)}}(.*?){{\/\1}}/gs;
    
    template = template.replace(conditionalRegex, (match, variable, content) => {
      return data[variable] ? content : '';
    });

    return template;
  }

  /**
   * Converter HTML para texto
   */
  htmlToText(html) {
    return html
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Enviar email de teste
   */
  async sendTestEmail(to) {
    try {
      const testData = {
        user_name: 'Usuário Teste',
        notification_title: 'Email de Teste',
        notification_message: 'Este é um email de teste do sistema de notificações.',
        action_url: 'https://exemplo.com',
        action_label: 'Clique aqui',
        unsubscribe_url: 'https://exemplo.com/unsubscribe'
      };

      return await this.sendNotification(
        to,
        'Teste - Sistema de Notificações',
        'default',
        testData
      );

    } catch (error) {
      console.error('❌ Erro ao enviar email de teste:', error);
      throw error;
    }
  }

  /**
   * Verificar configuração
   */
  async verifyConfiguration() {
    try {
      if (!this.initialized) {
        await this.initialize();
      }

      const verified = await this.transporter.verify();
      return {
        success: true,
        verified,
        config: {
          host: process.env.SMTP_HOST,
          port: process.env.SMTP_PORT,
          secure: process.env.SMTP_SECURE === 'true',
          user: process.env.SMTP_USER
        }
      };

    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Obter templates disponíveis
   */
  getAvailableTemplates() {
    return Array.from(this.templates.keys());
  }

  /**
   * Adicionar template personalizado
   */
  addTemplate(name, template) {
    this.templates.set(name, template);
  }

  /**
   * Remover template
   */
  removeTemplate(name) {
    if (name !== 'default') {
      this.templates.delete(name);
    }
  }
}

module.exports = EmailService;