-- Migration: 010_book_order_email_templates
-- Description: Update book order confirmation email and add gift order template

-- ============================================================================
-- UPDATE BOOK ORDER CONFIRMATION TEMPLATE WITH SHIPPING ADDRESS
-- ============================================================================

UPDATE public.email_templates
SET
  subject = 'Your Once Upon a Drawing Book is Being Made! Order #{{order_id}}',
  html_body = '<!DOCTYPE html>
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

          <!-- Success Badge -->
          <tr>
            <td style="padding: 40px 40px 0 40px; text-align: center;">
              <div style="display: inline-block; position: relative;">
                <div style="width: 100px; height: 100px; background: linear-gradient(135deg, rgba(255,215,0,0.3) 0%, rgba(0,180,216,0.3) 100%); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto;">
                  <span style="font-size: 56px;">📖</span>
                </div>
              </div>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 24px 40px 40px 40px;">
              <h2 style="color: #1e293b; margin: 0 0 16px 0; font-size: 26px; text-align: center; font-weight: 800;">Your Book is Being Created!</h2>

              <p style="color: #64748b; font-size: 16px; line-height: 1.6; text-align: center; margin: 0 0 32px 0;">
                Hi {{customer_name}}, thank you for your order! Magic is happening at the printer right now.
              </p>

              <!-- Order Details Box -->
              <div style="background-color: #f8fafc; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
                <h3 style="color: #1e293b; margin: 0 0 16px 0; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; font-weight: 700;">Order Details</h3>

                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="color: #64748b; padding: 8px 0; font-size: 14px;">Order Number</td>
                    <td style="color: #1e293b; padding: 8px 0; font-size: 14px; text-align: right; font-weight: 600; font-family: monospace;">#{{order_id}}</td>
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
                    <td style="color: #1e293b; padding: 16px 0 8px 0; font-size: 16px; font-weight: 700;">Total Paid</td>
                    <td style="color: #00B4D8; padding: 16px 0 8px 0; font-size: 16px; text-align: right; font-weight: 800;">{{amount_paid}}</td>
                  </tr>
                </table>
              </div>

              <!-- Shipping Address (only shown for hardcover) -->
              <div style="background-color: #f0f9ff; border-radius: 12px; padding: 24px; margin-bottom: 24px; border: 1px solid #bae6fd;">
                <h3 style="color: #0369a1; margin: 0 0 12px 0; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; font-weight: 700;">Shipping To</h3>
                <p style="color: #1e293b; font-size: 14px; line-height: 1.6; margin: 0;">{{shipping_address}}</p>
                <p style="color: #64748b; font-size: 13px; margin: 12px 0 0 0;">
                  <strong>Estimated Delivery:</strong> {{estimated_delivery}}
                </p>
              </div>

              <!-- What''s Next -->
              <div style="background-color: #1e293b; border-radius: 12px; padding: 24px; color: #ffffff;">
                <h3 style="color: #00B4D8; margin: 0 0 16px 0; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; font-weight: 700;">What Happens Next?</h3>
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="padding: 8px 0; vertical-align: top; width: 36px;">
                      <div style="background: rgba(255,255,255,0.1); width: 24px; height: 24px; border-radius: 50%; text-align: center; line-height: 24px; font-size: 12px; color: #fff;">1</div>
                    </td>
                    <td style="color: rgba(255,255,255,0.8); font-size: 14px; padding: 8px 0; line-height: 1.5;">Your book is being professionally printed (2-3 business days)</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; vertical-align: top; width: 36px;">
                      <div style="background: rgba(255,255,255,0.1); width: 24px; height: 24px; border-radius: 50%; text-align: center; line-height: 24px; font-size: 12px; color: #fff;">2</div>
                    </td>
                    <td style="color: rgba(255,255,255,0.8); font-size: 14px; padding: 8px 0; line-height: 1.5;">We''ll email you a tracking number when it ships</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; vertical-align: top; width: 36px;">
                      <div style="background: rgba(255,255,255,0.1); width: 24px; height: 24px; border-radius: 50%; text-align: center; line-height: 24px; font-size: 12px; color: #fff;">3</div>
                    </td>
                    <td style="color: rgba(255,255,255,0.8); font-size: 14px; padding: 8px 0; line-height: 1.5;">Your magical book arrives at your door!</td>
                  </tr>
                </table>
              </div>

              <!-- CTA Button -->
              <div style="text-align: center; margin-top: 32px;">
                <a href="{{order_status_url}}" style="display: inline-block; background: linear-gradient(135deg, #00B4D8 0%, #0077B6 100%); color: #ffffff; padding: 16px 40px; border-radius: 12px; text-decoration: none; font-weight: 700; font-size: 16px;">View Order Status</a>
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
  plain_text_body = 'Hi {{customer_name}},

Thank you for your order! Magic is happening at the printer right now.

ORDER DETAILS
-------------
Order Number: #{{order_id}}
Book Title: {{book_title}}
Artist: {{artist_name}}
Format: {{product_type}}
Total Paid: {{amount_paid}}

SHIPPING TO
-----------
{{shipping_address}}
Estimated Delivery: {{estimated_delivery}}

WHAT HAPPENS NEXT?
1. Your book is being professionally printed (2-3 business days)
2. We''ll email you a tracking number when it ships
3. Your magical book arrives at your door!

View your order status: {{order_status_url}}

Questions? Reply to this email or contact us at team@sproutify.app

© Once Upon a Drawing • onceuponadrawing.com',
  available_variables = '["customer_name", "order_id", "book_title", "artist_name", "product_type", "amount_paid", "shipping_address", "estimated_delivery", "order_status_url", "is_hardcover"]'::jsonb,
  updated_at = now()
WHERE template_key = 'book_order_confirmation';

-- ============================================================================
-- ADD GIFT ORDER CONFIRMATION TEMPLATE
-- ============================================================================

INSERT INTO public.email_templates (template_key, template_name, description, subject, html_body, plain_text_body, available_variables) VALUES
('book_order_confirmation_gift', 'Gift Book Order Confirmation', 'Sent when a gift book order payment is received',
'A Special Gift is On Its Way to {{recipient_name}}! Order #{{order_id}}',
'<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Gift Order Confirmation</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, ''Helvetica Neue'', Arial, sans-serif; background-color: #f8fafc;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header with Gift Theme -->
          <tr>
            <td style="background: linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%); padding: 40px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 800;">Once Upon a Drawing</h1>
              <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0 0; font-size: 16px;">Where drawings become stories</p>
            </td>
          </tr>

          <!-- Gift Icon -->
          <tr>
            <td style="padding: 40px 40px 0 40px; text-align: center;">
              <div style="display: inline-block; position: relative;">
                <div style="width: 100px; height: 100px; background: linear-gradient(135deg, rgba(236,72,153,0.2) 0%, rgba(139,92,246,0.2) 100%); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto;">
                  <span style="font-size: 56px;">🎁</span>
                </div>
              </div>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 24px 40px 40px 40px;">
              <h2 style="color: #1e293b; margin: 0 0 16px 0; font-size: 26px; text-align: center; font-weight: 800;">Your Gift is Being Created!</h2>

              <p style="color: #64748b; font-size: 16px; line-height: 1.6; text-align: center; margin: 0 0 32px 0;">
                Hi {{customer_name}}, what a wonderful gift! We''re creating a magical storybook for {{recipient_name}}.
              </p>

              <!-- Order Details Box -->
              <div style="background-color: #f8fafc; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
                <h3 style="color: #1e293b; margin: 0 0 16px 0; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; font-weight: 700;">Gift Details</h3>

                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="color: #64748b; padding: 8px 0; font-size: 14px;">Order Number</td>
                    <td style="color: #1e293b; padding: 8px 0; font-size: 14px; text-align: right; font-weight: 600; font-family: monospace;">#{{order_id}}</td>
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
                    <td style="color: #1e293b; padding: 16px 0 8px 0; font-size: 16px; font-weight: 700;">Total Paid</td>
                    <td style="color: #ec4899; padding: 16px 0 8px 0; font-size: 16px; text-align: right; font-weight: 800;">{{amount_paid}}</td>
                  </tr>
                </table>
              </div>

              <!-- Gift Recipient Shipping -->
              <div style="background: linear-gradient(135deg, #fdf2f8 0%, #f5f3ff 100%); border-radius: 12px; padding: 24px; margin-bottom: 24px; border: 1px solid #f9a8d4;">
                <h3 style="color: #9333ea; margin: 0 0 12px 0; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; font-weight: 700;">🎀 Shipping To Gift Recipient</h3>
                <p style="color: #1e293b; font-size: 14px; line-height: 1.6; margin: 0;">{{shipping_address}}</p>
                <p style="color: #64748b; font-size: 13px; margin: 12px 0 0 0;">
                  <strong>Estimated Delivery:</strong> {{estimated_delivery}}
                </p>
              </div>

              <!-- What''s Next -->
              <div style="background-color: #1e293b; border-radius: 12px; padding: 24px; color: #ffffff;">
                <h3 style="color: #f9a8d4; margin: 0 0 16px 0; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; font-weight: 700;">What Happens Next?</h3>
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="padding: 8px 0; vertical-align: top; width: 36px;">
                      <div style="background: rgba(255,255,255,0.1); width: 24px; height: 24px; border-radius: 50%; text-align: center; line-height: 24px; font-size: 12px; color: #fff;">1</div>
                    </td>
                    <td style="color: rgba(255,255,255,0.8); font-size: 14px; padding: 8px 0; line-height: 1.5;">The gift book is being professionally printed (2-3 business days)</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; vertical-align: top; width: 36px;">
                      <div style="background: rgba(255,255,255,0.1); width: 24px; height: 24px; border-radius: 50%; text-align: center; line-height: 24px; font-size: 12px; color: #fff;">2</div>
                    </td>
                    <td style="color: rgba(255,255,255,0.8); font-size: 14px; padding: 8px 0; line-height: 1.5;">We''ll email you the tracking number when it ships</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; vertical-align: top; width: 36px;">
                      <div style="background: rgba(255,255,255,0.1); width: 24px; height: 24px; border-radius: 50%; text-align: center; line-height: 24px; font-size: 12px; color: #fff;">3</div>
                    </td>
                    <td style="color: rgba(255,255,255,0.8); font-size: 14px; padding: 8px 0; line-height: 1.5;">The magical book arrives at {{recipient_name}}''s door!</td>
                  </tr>
                </table>
              </div>

              <!-- CTA Button -->
              <div style="text-align: center; margin-top: 32px;">
                <a href="{{order_status_url}}" style="display: inline-block; background: linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%); color: #ffffff; padding: 16px 40px; border-radius: 12px; text-decoration: none; font-weight: 700; font-size: 16px;">View Order Status</a>
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

What a wonderful gift! We''re creating a magical storybook for {{recipient_name}}.

GIFT DETAILS
------------
Order Number: #{{order_id}}
Book Title: {{book_title}}
Artist: {{artist_name}}
Format: {{product_type}}
Total Paid: {{amount_paid}}

SHIPPING TO GIFT RECIPIENT
--------------------------
{{shipping_address}}
Estimated Delivery: {{estimated_delivery}}

WHAT HAPPENS NEXT?
1. The gift book is being professionally printed (2-3 business days)
2. We''ll email you the tracking number when it ships
3. The magical book arrives at {{recipient_name}}''s door!

View your order status: {{order_status_url}}

Questions? Reply to this email or contact us at team@sproutify.app

© Once Upon a Drawing • onceuponadrawing.com',
'["customer_name", "recipient_name", "order_id", "book_title", "artist_name", "product_type", "amount_paid", "shipping_address", "estimated_delivery", "order_status_url", "is_hardcover", "is_gift"]'::jsonb)
ON CONFLICT (template_key) DO UPDATE SET
  template_name = EXCLUDED.template_name,
  description = EXCLUDED.description,
  subject = EXCLUDED.subject,
  html_body = EXCLUDED.html_body,
  plain_text_body = EXCLUDED.plain_text_body,
  available_variables = EXCLUDED.available_variables,
  updated_at = now();
