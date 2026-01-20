
/**
 * Email Service for Once Upon a Drawing
 * Powered by Resend (https://resend.com)
 */

export const sendWelcomeEmail = async (email: string, firstName: string) => {
  console.log(`[Resend Service] Preparing Welcome Email for ${email}`);
  
  // In a real environment, you would call your backend which uses the Resend SDK:
  // const resend = new Resend(process.env.RESEND_API_KEY);
  // await resend.emails.send({
  //   from: 'Studio <magic@onceuponadrawing.app>',
  //   to: email,
  //   subject: 'Welcome to the Studio',
  //   html: `<h1>Welcome, ${firstName}!</h1><p>Your magic journey begins here.</p>`
  // });

  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 800));
  return { success: true, messageId: `resend_${crypto.randomUUID()}` };
};

export const subscribeToNewsletter = async (email: string, firstName: string) => {
  console.log(`[Resend Service] Subscribing ${email} to Sweetwater Technologies Newsletter`);
  
  // Simulate API call to Resend Audience API
  await new Promise(resolve => setTimeout(resolve, 600));
  return { success: true };
};
