-- Update trigger to include a link to the wallet
CREATE OR REPLACE FUNCTION create_refund_notification()
RETURNS TRIGGER AS $$
BEGIN
  IF (NEW.type = 'refund') THEN
    INSERT INTO notifications (user_id, title, message, type, link)
    VALUES (
      NEW.user_id,
      'Refund Issued',
      'A refund of A$' || NEW.amount || ' has been processed: ' || NEW.description,
      'payment',
      '/wallet'
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
