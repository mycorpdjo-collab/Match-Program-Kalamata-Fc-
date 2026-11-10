import Link from 'next/link';

export const metadata = { title: 'Πολιτική Απορρήτου · Match Programme' };

// NOTE: draft wording — to be reviewed and confirmed by the club's legal advisor before launch.
export default function Privacy() {
  return (
    <div className="min-h-[100dvh] bg-white text-ink">
      <main className="mx-auto max-w-[68ch] px-4 py-12 text-[16px] leading-relaxed sm:py-16">
        <Link href="/" className="text-sm underline underline-offset-4">Πίσω στο πρόγραμμα</Link>
        <h1 className="mb-6 mt-8 font-brand text-[36px] font-extrabold tracking-[-0.02em]">Πολιτική Απορρήτου</h1>
        <p className="text-ink-80">Υπεύθυνος επεξεργασίας: Καλαμάτα Π.Α.Ε. Για οποιοδήποτε αίτημα σχετικά με τα δεδομένα σας επικοινωνήστε στο [email υπευθύνου προστασίας δεδομένων].</p>
        <h2 className="mt-10 font-brand text-xl font-extrabold">Τι συλλέγουμε</h2>
        <p>Το email σας, όταν ξεκλειδώνετε το Match Programme, μαζί με την ημερομηνία και ώρα, τον τύπο του browser σας και, αν υπάρχουν, τις παραμέτρους της καμπάνιας (utm) από τον σύνδεσμο που ακολουθήσατε.</p>
        <h2 className="mt-10 font-brand text-xl font-extrabold">Γιατί</h2>
        <p>Για να σας δώσουμε πρόσβαση στο πρόγραμμα του αγώνα. Αν επιλέξετε το προαιρετικό κουτί, θα σας στέλνουμε επίσης νέα και προσφορές της Καλαμάτας Π.Α.Ε. Η πρόσβαση στο πρόγραμμα δεν εξαρτάται από αυτή τη συγκατάθεση.</p>
        <h2 className="mt-10 font-brand text-xl font-extrabold">Cookies</h2>
        <p>Χρησιμοποιούμε ένα απαραίτητο cookie ανά τεύχος, για να μη χρειάζεται να ξαναγράψετε το email σας (διάρκεια ενός έτους). Μετράμε ανώνυμα ποιες σελίδες διαβάζονται, με ένα αναγνωριστικό που διαγράφεται όταν κλείσετε την καρτέλα.</p>
        <h2 className="mt-10 font-brand text-xl font-extrabold">Τα δικαιώματά σας</h2>
        <p>Μπορείτε να ζητήσετε πρόσβαση, διόρθωση ή διαγραφή των δεδομένων σας και να ανακαλέσετε τη συγκατάθεσή σας για ενημερώσεις οποιαδήποτε στιγμή, από τον σύνδεσμο διαγραφής σε κάθε email ή γράφοντάς μας. Έχετε επίσης δικαίωμα καταγγελίας στην Αρχή Προστασίας Δεδομένων Προσωπικού Χαρακτήρα.</p>
      </main>
    </div>
  );
}
