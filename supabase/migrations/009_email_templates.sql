-- Migration: 009_email_templates
-- Description: Create email_templates and email_logs tables for admin-managed email notifications

-- ============================================================================
-- EMAIL_TEMPLATES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.email_templates (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Template identification
    template_key text NOT NULL UNIQUE,  -- e.g., 'book_order_confirmation', 'book_shipped'
    template_name text NOT NULL,         -- Human-readable name for admin UI
    description text,                    -- Explains when this email is sent

    -- Template content
    subject text NOT NULL,               -- Email subject line (supports {{variables}})
    html_body text NOT NULL,             -- HTML email body (supports {{variables}})
    plain_text_body text,                -- Plain text fallback

    -- Available variables (stored as JSON for admin UI reference)
    available_variables jsonb DEFAULT '[]'::jsonb,

    -- Status
    is_active boolean DEFAULT true,

    -- Timestamps
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- ============================================================================
-- EMAIL_LOGS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.email_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    template_key text NOT NULL,
    recipient_email text NOT NULL,
    subject text NOT NULL,
    variables_used jsonb,               -- Snapshot of variables at send time
    resend_message_id text,             -- Resend API response ID
    status text DEFAULT 'sent' CHECK (status IN ('sent', 'failed', 'bounced', 'delivered')),
    error_message text,
    sent_at timestamptz DEFAULT now(),

    -- Link to related records
    user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    book_order_id uuid REFERENCES public.book_orders(id) ON DELETE SET NULL
);

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX idx_email_templates_key ON public.email_templates(template_key);
CREATE INDEX idx_email_logs_recipient ON public.email_logs(recipient_email);
CREATE INDEX idx_email_logs_template ON public.email_logs(template_key);
CREATE INDEX idx_email_logs_sent_at ON public.email_logs(sent_at);

-- ============================================================================
-- UPDATED_AT TRIGGER
-- ============================================================================

CREATE TRIGGER email_templates_updated_at
    BEFORE UPDATE ON public.email_templates
    FOR EACH ROW
    EXECUTE FUNCTION public.update_book_orders_updated_at();

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

-- Admin only for templates
CREATE POLICY "Admin can view email templates"
    ON public.email_templates
    FOR SELECT
    USING (auth.jwt() ->> 'email' = 'team@sproutify.app');

CREATE POLICY "Admin can update email templates"
    ON public.email_templates
    FOR UPDATE
    USING (auth.jwt() ->> 'email' = 'team@sproutify.app')
    WITH CHECK (auth.jwt() ->> 'email' = 'team@sproutify.app');

-- Admin only for logs
CREATE POLICY "Admin can view email logs"
    ON public.email_logs
    FOR SELECT
    USING (auth.jwt() ->> 'email' = 'team@sproutify.app');

-- ============================================================================
-- DEFAULT TEMPLATES
-- ============================================================================

INSERT INTO public.email_templates (template_key, template_name, description, subject, html_body, plain_text_body, available_variables) VALUES

-- Book Order Confirmation
('book_order_confirmation', 'Book Order Confirmation', 'Sent when a book order payment is received',
'Your magical book is being created! Order #{{order_id}}',
'<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Order Confirmation</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, ''Helvetica Neue'', Arial, sans-serif; background-color: #f8fafc;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #00B4D8 0%, #0077B6 100%); padding: 40px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 800;">Once Upon a Drawing</h1>
              <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0 0; font-size: 16px;">Where drawings become stories</p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <div style="text-align: center; margin-bottom: 32px;">
                <span style="font-size: 64px;">📖</span>
              </div>

              <h2 style="color: #1e293b; margin: 0 0 16px 0; font-size: 24px; text-align: center;">Your Book is Being Created!</h2>

              <p style="color: #64748b; font-size: 16px; line-height: 1.6; text-align: center; margin: 0 0 32px 0;">
                Hi {{customer_name}}, thank you for your order! We''re now creating your magical storybook.
              </p>

              <!-- Order Details Box -->
              <div style="background-color: #f8fafc; border-radius: 12px; padding: 24px; margin-bottom: 32px;">
                <h3 style="color: #1e293b; margin: 0 0 16px 0; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">Order Details</h3>

                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="color: #64748b; padding: 8px 0; font-size: 14px;">Order Number</td>
                    <td style="color: #1e293b; padding: 8px 0; font-size: 14px; text-align: right; font-weight: 600;">#{{order_id}}</td>
                  </tr>
                  <tr>
                    <td style="color: #64748b; padding: 8px 0; font-size: 14px;">Book Title</td>
                    <td style="color: #1e293b; padding: 8px 0; font-size: 14px; text-align: right; font-weight: 600;">{{book_title}}</td>
                  </tr>
                  <tr>
                    <td style="color: #64748b; padding: 8px 0; font-size: 14px;">Artist</td>
                    <td style="color: #1e293b; padding: 8px 0; font-size: 14px; text-align: right; font-weight: 600;">{{artist_name}}</td>
                  </tr>
                  <tr>
                    <td style="color: #64748b; padding: 8px 0; font-size: 14px;">Format</td>
                    <td style="color: #1e293b; padding: 8px 0; font-size: 14px; text-align: right; font-weight: 600;">{{product_type}}</td>
                  </tr>
                  <tr style="border-top: 1px solid #e2e8f0;">
                    <td style="color: #1e293b; padding: 16px 0 8px 0; font-size: 16px; font-weight: 700;">Total</td>
                    <td style="color: #00B4D8; padding: 16px 0 8px 0; font-size: 16px; text-align: right; font-weight: 700;">{{amount_paid}}</td>
                  </tr>
                </table>
              </div>

              <!-- What''s Next -->
              <div style="background-color: #1e293b; border-radius: 12px; padding: 24px; color: #ffffff;">
                <h3 style="color: #00B4D8; margin: 0 0 16px 0; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">What Happens Next?</h3>
                <div style="display: flex; margin-bottom: 12px;">
                  <span style="background: rgba(255,255,255,0.1); width: 24px; height: 24px; border-radius: 50%; display: inline-block; text-align: center; line-height: 24px; font-size: 12px; margin-right: 12px;">1</span>
                  <span style="color: rgba(255,255,255,0.8); font-size: 14px;">Your book is being professionally printed (2-3 days)</span>
                </div>
                <div style="display: flex; margin-bottom: 12px;">
                  <span style="background: rgba(255,255,255,0.1); width: 24px; height: 24px; border-radius: 50%; display: inline-block; text-align: center; line-height: 24px; font-size: 12px; margin-right: 12px;">2</span>
                  <span style="color: rgba(255,255,255,0.8); font-size: 14px;">We''ll email you a tracking number when it ships</span>
                </div>
                <div style="display: flex;">
                  <span style="background: rgba(255,255,255,0.1); width: 24px; height: 24px; border-radius: 50%; display: inline-block; text-align: center; line-height: 24px; font-size: 12px; margin-right: 12px;">3</span>
                  <span style="color: rgba(255,255,255,0.8); font-size: 14px;">Your magical book arrives at your door!</span>
                </div>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 24px; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="color: #64748b; font-size: 12px; margin: 0;">
                Questions? Reply to this email or contact us at team@sproutify.app
              </p>
              <p style="color: #94a3b8; font-size: 12px; margin: 8px 0 0 0;">
                © Once Upon a Drawing • onceuponadrawing.com
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>',
'Hi {{customer_name}},

Thank you for your order! We''re now creating your magical storybook.

ORDER DETAILS
-------------
Order Number: #{{order_id}}
Book Title: {{book_title}}
Artist: {{artist_name}}
Format: {{product_type}}
Total: {{amount_paid}}

WHAT HAPPENS NEXT?
1. Your book is being professionally printed (2-3 days)
2. We''ll email you a tracking number when it ships
3. Your magical book arrives at your door!

Questions? Reply to this email or contact us at team@sproutify.app

© Once Upon a Drawing • onceuponadrawing.com',
'["customer_name", "order_id", "book_title", "artist_name", "product_type", "amount_paid"]'::jsonb),

-- Book Shipped
('book_shipped', 'Book Shipped Notification', 'Sent when a book ships from the printer',
'Your book is on its way! 📦 Tracking: {{tracking_number}}',
'<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Book Has Shipped!</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, ''Helvetica Neue'', Arial, sans-serif; background-color: #f8fafc;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 800;">Once Upon a Drawing</h1>
              <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0 0; font-size: 16px;">Where drawings become stories</p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <div style="text-align: center; margin-bottom: 32px;">
                <span style="font-size: 64px;">📦</span>
              </div>

              <h2 style="color: #1e293b; margin: 0 0 16px 0; font-size: 24px; text-align: center;">Your Book is On Its Way!</h2>

              <p style="color: #64748b; font-size: 16px; line-height: 1.6; text-align: center; margin: 0 0 32px 0;">
                Great news, {{customer_name}}! Your magical storybook has shipped and is heading your way.
              </p>

              <!-- Tracking Box -->
              <div style="background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); border-radius: 12px; padding: 24px; margin-bottom: 32px; text-align: center; border: 2px solid #10b981;">
                <p style="color: #064e3b; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 8px 0; font-weight: 600;">Tracking Number</p>
                <p style="color: #1e293b; font-size: 24px; font-weight: 700; margin: 0 0 16px 0; font-family: monospace;">{{tracking_number}}</p>
                <a href="{{tracking_url}}" style="display: inline-block; background-color: #10b981; color: #ffffff; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px;">Track Your Package →</a>
              </div>

              <!-- Order Details -->
              <div style="background-color: #f8fafc; border-radius: 12px; padding: 24px;">
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="color: #64748b; padding: 8px 0; font-size: 14px;">Order Number</td>
                    <td style="color: #1e293b; padding: 8px 0; font-size: 14px; text-align: right; font-weight: 600;">#{{order_id}}</td>
                  </tr>
                  <tr>
                    <td style="color: #64748b; padding: 8px 0; font-size: 14px;">Book Title</td>
                    <td style="color: #1e293b; padding: 8px 0; font-size: 14px; text-align: right; font-weight: 600;">{{book_title}}</td>
                  </tr>
                </table>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 24px; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="color: #64748b; font-size: 12px; margin: 0;">
                Questions? Reply to this email or contact us at team@sproutify.app
              </p>
              <p style="color: #94a3b8; font-size: 12px; margin: 8px 0 0 0;">
                © Once Upon a Drawing • onceuponadrawing.com
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>',
'Hi {{customer_name}},

Great news! Your magical storybook has shipped and is heading your way.

TRACKING INFORMATION
--------------------
Tracking Number: {{tracking_number}}
Track your package: {{tracking_url}}

Order Number: #{{order_id}}
Book Title: {{book_title}}

Questions? Reply to this email or contact us at team@sproutify.app

© Once Upon a Drawing • onceuponadrawing.com',
'["customer_name", "order_id", "book_title", "tracking_number", "tracking_url"]'::jsonb),

-- Credit Purchase Confirmation
('credit_purchase_confirmation', 'Credit Purchase Confirmation', 'Sent after successful credit pack purchase',
'Your credits are ready! ✨ {{credits_added}} credits added',
'<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Credits Added!</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, ''Helvetica Neue'', Arial, sans-serif; background-color: #f8fafc;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #FFD700 0%, #FFA500 100%); padding: 40px; text-align: center;">
              <h1 style="color: #1e293b; margin: 0; font-size: 28px; font-weight: 800;">Once Upon a Drawing</h1>
              <p style="color: rgba(0,0,0,0.7); margin: 8px 0 0 0; font-size: 16px;">Where drawings become stories</p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <div style="text-align: center; margin-bottom: 32px;">
                <span style="font-size: 64px;">✨</span>
              </div>

              <h2 style="color: #1e293b; margin: 0 0 16px 0; font-size: 24px; text-align: center;">Your Credits Are Ready!</h2>

              <p style="color: #64748b; font-size: 16px; line-height: 1.6; text-align: center; margin: 0 0 32px 0;">
                Hi {{customer_name}}, your purchase was successful! Time to turn more treasured drawings into magical stories.
              </p>

              <!-- Credits Display -->
              <div style="background: linear-gradient(135deg, #00B4D8 0%, #0077B6 100%); border-radius: 16px; padding: 32px; margin-bottom: 32px; text-align: center;">
                <p style="color: rgba(255,255,255,0.8); font-size: 14px; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 8px 0;">Credits Added</p>
                <p style="color: #ffffff; font-size: 56px; font-weight: 800; margin: 0 0 8px 0;">+{{credits_added}}</p>
                <p style="color: rgba(255,255,255,0.8); font-size: 14px; margin: 0;">Your new balance: <strong>{{new_balance}} credits</strong></p>
              </div>

              <!-- Purchase Details -->
              <div style="background-color: #f8fafc; border-radius: 12px; padding: 24px; margin-bottom: 32px;">
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="color: #64748b; padding: 8px 0; font-size: 14px;">Pack</td>
                    <td style="color: #1e293b; padding: 8px 0; font-size: 14px; text-align: right; font-weight: 600;">{{pack_name}}</td>
                  </tr>
                  <tr>
                    <td style="color: #64748b; padding: 8px 0; font-size: 14px;">Amount Paid</td>
                    <td style="color: #1e293b; padding: 8px 0; font-size: 14px; text-align: right; font-weight: 600;">{{amount_paid}}</td>
                  </tr>
                </table>
              </div>

              <!-- CTA -->
              <div style="text-align: center;">
                <a href="https://onceuponadrawing.com" style="display: inline-block; background: linear-gradient(135deg, #00B4D8 0%, #0077B6 100%); color: #ffffff; padding: 16px 40px; border-radius: 12px; text-decoration: none; font-weight: 700; font-size: 16px;">Start Creating ✨</a>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 24px; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="color: #64748b; font-size: 12px; margin: 0;">
                Questions? Reply to this email or contact us at team@sproutify.app
              </p>
              <p style="color: #94a3b8; font-size: 12px; margin: 8px 0 0 0;">
                © Once Upon a Drawing • onceuponadrawing.com
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>',
'Hi {{customer_name}},

Your purchase was successful! Time to turn more treasured drawings into magical stories.

CREDITS ADDED: +{{credits_added}}
Your new balance: {{new_balance}} credits

PURCHASE DETAILS
----------------
Pack: {{pack_name}}
Amount Paid: {{amount_paid}}

Ready to create? Visit onceuponadrawing.com

Questions? Reply to this email or contact us at team@sproutify.app

© Once Upon a Drawing • onceuponadrawing.com',
'["customer_name", "credits_added", "new_balance", "pack_name", "amount_paid"]'::jsonb);

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE public.email_templates IS 'Admin-editable email templates with variable substitution';
COMMENT ON TABLE public.email_logs IS 'Log of all emails sent through the system';
COMMENT ON COLUMN public.email_templates.template_key IS 'Unique identifier used in code to reference template';
COMMENT ON COLUMN public.email_templates.available_variables IS 'JSON array of variable names that can be used in this template';
